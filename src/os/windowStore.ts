/**
 * Window manager — the matrix-os pattern in a small Zustand store:
 * open/close/focus/minimize/maximize with monotonic z-ordering, plus layout
 * persistence that ALSO remembers closed-window geometry so relaunching an
 * app restores where the user left it.
 */
import { create } from "zustand";
import { syncNativeClose, syncNativeFocus, syncNativeOpen } from "./nativeAppWindows";
import { useOsStore } from "./osStore";

export type SystemAppId =
  | "chat"
  | "studio"
  | "apps"
  | "skills"
  | "agents"
  | "keywallet"
  | "apis"
  | "automations"
  | "files"
  | "notes"
  | "email"
  | "calendar"
  | "tasks"
  | "board"
  | "contacts"
  | "maps"
  | "search"
  | "music"
  | "video"
  | "meet"
  | "podcast"
  | "downloads"
  | "pay"
  | "groups"
  | "social"
  | "messenger"
  | "sheets"
  | "generator"
  | "imagegen"
  | "terminal"
  | "settings"
  | "startup"
  | "onboarding"
  | "memory"
  | "longformer"
  | "kamiji"
  | "keyboard"
  | "models";

/** Window identity. System apps are usually singleton; Drive may set `instanceId`. */
export type WindowKind =
  | { type: "system"; app: SystemAppId; instanceId?: string }
  /** An AI-generated OpenUI app from the library. */
  | { type: "generated"; appId: string }
  /** A registered user project embedded by URL (dock "web apps" section). */
  | { type: "web"; webAppId: string }
  /** An installed platform app (manifest + bridge — see AppHost). */
  | { type: "installed"; appId: string };

/** System apps that may have more than one window open at once. */
const MULTI_INSTANCE_SYSTEM_APPS = new Set<SystemAppId>(["files"]);

export interface WindowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OsWindow extends WindowRect {
  id: string;
  kind: WindowKind;
  title: string;
  minimized: boolean;
  maximized: boolean;
  z: number;
}

/** Stable identity for a specific window (includes instance id when present). */
export function windowKey(kind: WindowKind): string {
  switch (kind.type) {
    case "system":
      return kind.instanceId ? `system:${kind.app}:${kind.instanceId}` : `system:${kind.app}`;
    case "generated":
      return `generated:${kind.appId}`;
    case "web":
      return `web:${kind.webAppId}`;
    case "installed":
      return `installed:${kind.appId}`;
  }
}

/** App-level identity used by Dock/Nav pins (never includes an instance id). */
export function appIdentityKey(kind: WindowKind): string {
  switch (kind.type) {
    case "system":
      return `system:${kind.app}`;
    case "generated":
      return `generated:${kind.appId}`;
    case "web":
      return `web:${kind.webAppId}`;
    case "installed":
      return `installed:${kind.appId}`;
  }
}

export function allowsMultipleWindows(kind: WindowKind): boolean {
  return kind.type === "system" && MULTI_INSTANCE_SYSTEM_APPS.has(kind.app);
}

/** True when `winId` is the primary or an instance window for `appKey`. */
export function windowMatchesApp(winId: string, appKey: string): boolean {
  return winId === appKey || winId.startsWith(`${appKey}:`);
}

export function findAppWindows(windows: OsWindow[], appKey: string): OsWindow[] {
  return windows.filter((w) => windowMatchesApp(w.id, appKey));
}

export function findFrontmostAppWindow(windows: OsWindow[], appKey: string): OsWindow | undefined {
  return [...findAppWindows(windows, appKey)].sort((a, b) => b.z - a.z)[0];
}

/** Inverse of windowKey — used by standalone Electron app windows. */
export function parseWindowKey(key: string): WindowKind | null {
  if (key.startsWith("system:")) {
    const rest = key.slice("system:".length);
    const colon = rest.indexOf(":");
    if (colon === -1) {
      return { type: "system", app: rest as SystemAppId };
    }
    return {
      type: "system",
      app: rest.slice(0, colon) as SystemAppId,
      instanceId: rest.slice(colon + 1),
    };
  }
  if (key.startsWith("generated:")) {
    return { type: "generated", appId: key.slice("generated:".length) };
  }
  if (key.startsWith("web:")) {
    return { type: "web", webAppId: key.slice("web:".length) };
  }
  if (key.startsWith("installed:")) {
    return { type: "installed", appId: key.slice("installed:".length) };
  }
  return null;
}

function newInstanceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

interface PersistedLayout {
  windows: OsWindow[];
  closedGeometry: Record<string, WindowRect>;
  nextZ: number;
}

const STORAGE_KEY = "arco:layout:v1";
/** Clears sticky App view / maximize / fractional geometry left by the 3D prototype. */
const POST_3D_LAYOUT_FIX_KEY = "arco:layout-post-3d-v3";

/**
 * Layouts persisted before the app-ontology rename used kind types
 * "app"/"ext" and key prefixes "app:"/"ext:". Map them forward so open
 * windows and remembered geometry survive the upgrade.
 */
function migrateLayout(layout: PersistedLayout): PersistedLayout {
  const migrateKind = (kind: WindowKind | { type: "app"; appId: string } | { type: "ext"; extId: string }): WindowKind => {
    if (kind.type === "app") return { type: "generated", appId: kind.appId };
    if (kind.type === "ext") return { type: "installed", appId: kind.extId };
    return kind;
  };
  const migrateKey = (key: string): string =>
    key.startsWith("app:")
      ? `generated:${key.slice(4)}`
      : key.startsWith("ext:")
        ? `installed:${key.slice(4)}`
        : key;
  return {
    ...layout,
    windows: (layout.windows ?? []).map((w) => {
      const kind = migrateKind(w.kind as never);
      return { ...w, kind, id: windowKey(kind) };
    }),
    closedGeometry: Object.fromEntries(
      Object.entries(layout.closedGeometry ?? {}).map(([k, v]) => [migrateKey(k), v]),
    ),
  };
}

function sanitizeRect(rect: WindowRect): WindowRect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    w: Math.round(rect.w),
    h: Math.round(rect.h),
  };
}

/**
 * One-shot cleanup after the experimental 3D window layer: sessions often left
 * App view on (every window fills the screen), windows maximized, or fractional
 * pose from world sync.
 */
function applyPost3dLayoutFix(layout: PersistedLayout): PersistedLayout {
  if (typeof localStorage === "undefined") return layout;
  if (localStorage.getItem(POST_3D_LAYOUT_FIX_KEY) === "1") return layout;
  localStorage.setItem(POST_3D_LAYOUT_FIX_KEY, "1");
  // App view makes every window look "maximized"; restore floating desktop.
  if (localStorage.getItem("arco:shell-view") === "app") {
    localStorage.setItem("arco:shell-view", "desktop");
  }
  return {
    ...layout,
    windows: (layout.windows ?? []).map((w) => ({
      ...w,
      ...sanitizeRect(w),
      maximized: false,
    })),
    closedGeometry: Object.fromEntries(
      Object.entries(layout.closedGeometry ?? {}).map(([k, v]) => [k, sanitizeRect(v)]),
    ),
  };
}

function loadLayout(): PersistedLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const migrated = applyPost3dLayoutFix(migrateLayout(JSON.parse(raw) as PersistedLayout));
      // Persist immediately so Chrome keeps the restored sizes after reload.
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            windows: migrated.windows,
            closedGeometry: migrated.closedGeometry,
            nextZ: migrated.nextZ,
          } satisfies PersistedLayout),
        );
      } catch {
        // Quota errors are non-fatal.
      }
      return migrated;
    }
  } catch {
    // Corrupt layout — start fresh.
  }
  return { windows: [], closedGeometry: {}, nextZ: 10 };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persist(state: WindowStore): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const payload: PersistedLayout = {
      windows: state.windows,
      closedGeometry: state.closedGeometry,
      nextZ: state.nextZ,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Quota errors are non-fatal.
    }
  }, 400);
}

const DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  "system:chat": { w: 560, h: 680 },
  // Studio is a workbench — it wants most of the screen by default.
  "system:studio": { w: 1180, h: 760 },
  "system:apps": { w: 760, h: 560 },
  "system:skills": { w: 760, h: 620 },
  "system:board": { w: 1180, h: 720 },
  "system:automations": { w: 760, h: 620 },
  "system:files": { w: 1080, h: 680 },
  "system:downloads": { w: 980, h: 640 },
  "system:maps": { w: 1180, h: 760 },
  "system:sheets": { w: 1180, h: 760 },
  "system:terminal": { w: 640, h: 440 },
  "system:settings": { w: 560, h: 620 },
  "system:startup": { w: 980, h: 720 },
  // Calculator is a device-sized widget — titlebar sits directly on the pad.
  "installed:core.calculator": { w: 400, h: 680 },
};

/** Default size lookup — instance windows inherit the app's preferred size. */
function defaultSizeKey(key: string): string {
  if (DEFAULT_SIZES[key]) return key;
  const systemBase = key.match(/^(system:[^:]+)/)?.[1];
  if (systemBase && DEFAULT_SIZES[systemBase]) return systemBase;
  return key;
}

const MENUBAR_HEIGHT = 34;
const WINDOW_MARGIN = 12;
const MIN_W = 320;
const MIN_H = 220;
/** Min on-screen strip so a window dragged past the viewport edge stays recoverable. */
const TITLEBAR_REACH = 48;

function navWidth(): number {
  if (typeof window === "undefined") return 56;
  const shell = document.querySelector<HTMLElement>(".arco-desktop") ?? document.documentElement;
  const raw = getComputedStyle(shell).getPropertyValue("--arco-nav-width").trim();
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 56;
}

/**
 * Keep windows reachable. When Settings → "Allow windows off-screen" is on,
 * position may hang past the browser edge (titlebar grab strip stays visible).
 * When off, windows stay fully inside the desktop work area.
 * Size is always capped so a window cannot exceed the work area.
 */
function ensureVisibleRect(key: string, rect: WindowRect, index: number): WindowRect {
  if (typeof window === "undefined") return rect;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const leftBound = navWidth() + WINDOW_MARGIN;
  const topBound = MENUBAR_HEIGHT + 2;
  const maxW = Math.max(MIN_W, vw - leftBound - WINDOW_MARGIN);
  const maxH = Math.max(MIN_H, vh - topBound - WINDOW_MARGIN);
  let { x, y, w, h } = rect;

  if (![x, y, w, h].every(Number.isFinite)) {
    return defaultRect(key, index);
  }

  w = Math.min(Math.max(MIN_W, w), maxW);
  h = Math.min(Math.max(MIN_H, h), maxH);

  if (useOsStore.getState().windowsOffscreen) {
    x = Math.max(TITLEBAR_REACH - w, Math.min(x, vw - TITLEBAR_REACH));
    y = Math.max(topBound, Math.min(y, vh - TITLEBAR_REACH));
  } else {
    x = Math.max(leftBound, Math.min(x, vw - w - WINDOW_MARGIN));
    y = Math.max(topBound, Math.min(y, vh - h - WINDOW_MARGIN));
  }
  return { x, y, w, h };
}

function defaultRect(key: string, index: number): WindowRect {
  // Web apps are full projects — give them a workbench-sized window.
  // Installed apps get a roomy default too; they're real apps, not widgets.
  const fallback = key.startsWith("web:")
    ? { w: 1000, h: 700 }
    : key.startsWith("installed:")
      ? { w: 960, h: 660 }
      : { w: 720, h: 560 };
  const size = DEFAULT_SIZES[defaultSizeKey(key)] ?? fallback;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  const leftBound = typeof window !== "undefined" ? navWidth() + WINDOW_MARGIN : WINDOW_MARGIN;
  const topBound = MENUBAR_HEIGHT + 2;
  const w = Math.min(size.w, Math.max(MIN_W, vw - leftBound - WINDOW_MARGIN));
  const h = Math.min(size.h, Math.max(MIN_H, vh - topBound - WINDOW_MARGIN));
  const offset = (index % 6) * 32;
  return {
    x: Math.max(
      leftBound,
      Math.min(Math.round(leftBound + (vw - leftBound - w) / 2) + offset, vw - w - WINDOW_MARGIN),
    ),
    y: Math.max(
      topBound,
      Math.min(Math.round(topBound + (vh - topBound - h) / 2) + offset, vh - h - WINDOW_MARGIN),
    ),
    w,
    h,
  };
}

interface WindowStore {
  windows: OsWindow[];
  closedGeometry: Record<string, WindowRect>;
  nextZ: number;

  open: (kind: WindowKind, title: string) => void;
  /** Always spawn a new window for multi-instance apps (e.g. Drive). */
  openNew: (kind: WindowKind, title: string) => void;
  close: (id: string, options?: { fromNative?: boolean }) => void;
  focus: (id: string) => void;
  toggleMinimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  setRect: (id: string, rect: Partial<WindowRect>) => void;
  constrainToViewport: () => void;
  setTitle: (id: string, title: string) => void;
  focusedId: () => string | null;
}

function createWindow(
  state: WindowStore,
  kind: WindowKind,
  title: string,
  id: string,
): { next: WindowStore; id: string } {
  const remembered = state.closedGeometry[id] ?? defaultRect(id, state.windows.length);
  const rect = ensureVisibleRect(id, remembered, state.windows.length);
  const win: OsWindow = {
    id,
    kind,
    title,
    ...rect,
    minimized: false,
    maximized: false,
    z: state.nextZ,
  };
  const next = {
    ...state,
    windows: [...state.windows, win],
    nextZ: state.nextZ + 1,
  } as WindowStore;
  persist(next);
  return { next, id };
}

function focusExistingWindow(
  state: WindowStore,
  existing: OsWindow,
  title: string,
): WindowStore {
  const rect = ensureVisibleRect(existing.id, existing, state.windows.indexOf(existing));
  const next = {
    ...state,
    windows: state.windows.map((w) =>
      w.id === existing.id ? { ...w, ...rect, minimized: false, title, z: state.nextZ } : w,
    ),
    nextZ: state.nextZ + 1,
  } as WindowStore;
  persist(next);
  return next;
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  ...loadLayout(),

  open: (kind, title) => {
    let openedId = windowKey(kind);
    set((state) => {
      // Explicit instance → that window only. Multi-instance app without
      // instanceId → focus the frontmost open window of that app.
      let existing: OsWindow | undefined;
      if (kind.type === "system" && kind.instanceId) {
        existing = state.windows.find((w) => w.id === openedId);
      } else if (allowsMultipleWindows(kind)) {
        existing = findFrontmostAppWindow(state.windows, appIdentityKey(kind));
        if (existing) openedId = existing.id;
        else openedId = appIdentityKey(kind);
      } else {
        existing = state.windows.find((w) => w.id === openedId);
      }

      if (existing) {
        return focusExistingWindow(state, existing, title);
      }
      const created = createWindow(state, kind.type === "system" ? { type: "system", app: kind.app } : kind, title, openedId);
      openedId = created.id;
      return created.next;
    });
    syncNativeOpen(openedId, title);
  },

  openNew: (kind, title) => {
    if (!allowsMultipleWindows(kind) || kind.type !== "system") {
      get().open(kind, title);
      return;
    }
    const instanceKind: WindowKind = {
      type: "system",
      app: kind.app,
      instanceId: newInstanceId(),
    };
    const id = windowKey(instanceKind);
    set((state) => createWindow(state, instanceKind, title, id).next);
    syncNativeOpen(id, title);
  },

  close: (id, options) => {
    set((state) => {
      const win = state.windows.find((w) => w.id === id);
      const next = {
        ...state,
        windows: state.windows.filter((w) => w.id !== id),
        closedGeometry: win
          ? { ...state.closedGeometry, [id]: { x: win.x, y: win.y, w: win.w, h: win.h } }
          : state.closedGeometry,
      } as WindowStore;
      persist(next);
      return next;
    });
    if (!options?.fromNative) syncNativeClose(id);
  },

  focus: (id) => {
    set((state) => {
      const target = state.windows.find((w) => w.id === id);
      const top = [...state.windows].sort((a, b) => b.z - a.z)[0];
      if (top?.id === id && !top.minimized) return state;
      const rect = target ? ensureVisibleRect(id, target, state.windows.indexOf(target)) : undefined;
      const next = {
        ...state,
        windows: state.windows.map((w) =>
          w.id === id ? { ...w, ...(rect ?? {}), z: state.nextZ, minimized: false } : w,
        ),
        nextZ: state.nextZ + 1,
      } as WindowStore;
      persist(next);
      return next;
    });
    syncNativeFocus(id);
  },

  toggleMinimize: (id) => {
    set((state) => {
      const next = {
        ...state,
        windows: state.windows.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w)),
      } as WindowStore;
      persist(next);
      return next;
    });
  },

  toggleMaximize: (id) => {
    set((state) => {
      const next = {
        ...state,
        windows: state.windows.map((w) =>
          w.id === id ? { ...w, maximized: !w.maximized, z: state.nextZ } : w,
        ),
        nextZ: state.nextZ + 1,
      } as WindowStore;
      persist(next);
      return next;
    });
  },

  setRect: (id, rect) => {
    set((state) => {
      const current = state.windows.find((w) => w.id === id);
      if (!current) return state;
      const nextRect = ensureVisibleRect(id, { ...current, ...rect }, state.windows.indexOf(current));
      const next = {
        ...state,
        windows: state.windows.map((w) => (w.id === id ? { ...w, ...nextRect } : w)),
      } as WindowStore;
      persist(next);
      return next;
    });
  },

  constrainToViewport: () => {
    set((state) => {
      let changed = false;
      const windows = state.windows.map((win, index) => {
        const rect = ensureVisibleRect(win.id, win, index);
        if (rect.x === win.x && rect.y === win.y && rect.w === win.w && rect.h === win.h) return win;
        changed = true;
        return { ...win, ...rect };
      });
      if (!changed) return state;
      const next = { ...state, windows } as WindowStore;
      persist(next);
      return next;
    });
  },

  setTitle: (id, title) => {
    set((state) => ({
      ...state,
      windows: state.windows.map((w) => (w.id === id ? { ...w, title } : w)),
    }));
  },

  focusedId: () => {
    const visible = get().windows.filter((w) => !w.minimized);
    if (visible.length === 0) return null;
    return [...visible].sort((a, b) => b.z - a.z)[0].id;
  },
}));
