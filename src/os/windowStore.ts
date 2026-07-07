/**
 * Window manager — the matrix-os pattern in a small Zustand store:
 * open/close/focus/minimize/maximize with monotonic z-ordering, plus layout
 * persistence that ALSO remembers closed-window geometry so relaunching an
 * app restores where the user left it.
 */
import { create } from "zustand";
import { syncNativeClose, syncNativeFocus, syncNativeOpen } from "./nativeAppWindows";

export type SystemAppId =
  | "chat"
  | "studio"
  | "apps"
  | "skills"
  | "keywallet"
  | "apis"
  | "automations"
  | "files"
  | "notes"
  | "email"
  | "calendar"
  | "tasks"
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
  | "kamiji";

export type WindowKind =
  | { type: "system"; app: SystemAppId }
  /** An AI-generated OpenUI app from the library. */
  | { type: "generated"; appId: string }
  /** A registered user project embedded by URL (dock "web apps" section). */
  | { type: "web"; webAppId: string }
  /** An installed platform app (manifest + bridge — see AppHost). */
  | { type: "installed"; appId: string };

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

/** Stable identity: one window per system app / per generated app. */
export function windowKey(kind: WindowKind): string {
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

/** Inverse of windowKey — used by standalone Electron app windows. */
export function parseWindowKey(key: string): WindowKind | null {
  if (key.startsWith("system:")) {
    const app = key.slice("system:".length) as SystemAppId;
    return { type: "system", app };
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

interface PersistedLayout {
  windows: OsWindow[];
  closedGeometry: Record<string, WindowRect>;
  nextZ: number;
}

const STORAGE_KEY = "arco:layout:v1";

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

function loadLayout(): PersistedLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrateLayout(JSON.parse(raw) as PersistedLayout);
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
  "system:automations": { w: 760, h: 620 },
  "system:files": { w: 1080, h: 680 },
  "system:downloads": { w: 980, h: 640 },
  "system:maps": { w: 1180, h: 760 },
  "system:sheets": { w: 1180, h: 760 },
  "system:terminal": { w: 640, h: 440 },
  "system:settings": { w: 560, h: 620 },
  "system:startup": { w: 980, h: 720 },
};

const MENUBAR_HEIGHT = 34;
const MIN_VISIBLE = 80;

function navWidth(): number {
  if (typeof window === "undefined") return 56;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--arco-nav-width").trim();
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 56;
}

/** Keep restored windows reachable — persisted layouts can land off-screen. */
function ensureVisibleRect(key: string, rect: WindowRect, index: number): WindowRect {
  if (typeof window === "undefined") return rect;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const leftBound = navWidth() + 12;
  let { x, y, w, h } = rect;
  const visibleW = Math.max(0, Math.min(x + w, vw) - Math.max(x, leftBound));
  const visibleH = Math.max(0, Math.min(y + h, vh) - Math.max(y, MENUBAR_HEIGHT));
  if (visibleW < MIN_VISIBLE || visibleH < MIN_VISIBLE) {
    return defaultRect(key, index);
  }
  w = Math.min(w, vw - leftBound - 12);
  h = Math.min(h, vh - MENUBAR_HEIGHT - 12);
  x = Math.max(leftBound, Math.min(x, vw - w - 12));
  y = Math.max(MENUBAR_HEIGHT + 2, Math.min(y, vh - h - 12));
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
  const size = DEFAULT_SIZES[key] ?? fallback;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  const offset = (index % 6) * 32;
  return {
    x: Math.max(12, Math.round(vw / 2 - size.w / 2) + offset),
    y: Math.max(44, Math.round(vh / 2 - size.h / 2 - 40) + offset),
    w: Math.min(size.w, vw - 24),
    h: Math.min(size.h, vh - 100),
  };
}

interface WindowStore {
  windows: OsWindow[];
  closedGeometry: Record<string, WindowRect>;
  nextZ: number;

  open: (kind: WindowKind, title: string) => void;
  close: (id: string, options?: { fromNative?: boolean }) => void;
  focus: (id: string) => void;
  toggleMinimize: (id: string) => void;
  toggleMaximize: (id: string) => void;
  setRect: (id: string, rect: Partial<WindowRect>) => void;
  setTitle: (id: string, title: string) => void;
  focusedId: () => string | null;
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  ...loadLayout(),

  open: (kind, title) => {
    const id = windowKey(kind);
    set((state) => {
      const existing = state.windows.find((w) => w.id === id);
      let next: WindowStore;
      if (existing) {
        const rect = ensureVisibleRect(id, existing, state.windows.indexOf(existing));
        next = {
          ...state,
          windows: state.windows.map((w) =>
            w.id === id ? { ...w, ...rect, minimized: false, title, z: state.nextZ } : w,
          ),
          nextZ: state.nextZ + 1,
        } as WindowStore;
      } else {
        const rect = state.closedGeometry[id] ?? defaultRect(id, state.windows.length);
        const win: OsWindow = {
          id,
          kind,
          title,
          ...rect,
          minimized: false,
          maximized: false,
          z: state.nextZ,
        };
        next = {
          ...state,
          windows: [...state.windows, win],
          nextZ: state.nextZ + 1,
        } as WindowStore;
      }
      persist(next);
      return next;
    });
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
      const next = {
        ...state,
        windows: state.windows.map((w) => (w.id === id ? { ...w, ...rect } : w)),
      } as WindowStore;
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
