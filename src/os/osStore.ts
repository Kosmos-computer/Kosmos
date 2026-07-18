/**
 * Shell-level state: theme, wallpaper, notifications, and the generated-app
 * list shared by the dock, the Apps library, and os_ui handling.
 */
import { create } from "zustand";
import type { AppSummary, ConfirmOption, WebApp } from "@shared/types";
import type { InstalledAppInfo } from "@shared/manifest";
import { api } from "../lib/api";
import { getArcoDesktop } from "../lib/desktopBridge";
import { normalizeWallpaper, type WallpaperId } from "./wallpaper/wallpapers";
import { normalizeAuthWallpaper, type AuthWallpaperId } from "./wallpaper/authWallpapers";
import {
  ACCENT_PRESET_STORAGE_KEY,
  applyAccentPreset,
  applyFontPreset,
  applyRadiusPreset,
  applySpacingPreset,
  applyTextScalePreset,
  FONT_PRESET_STORAGE_KEY,
  normalizeAccentPreset,
  normalizeFontPreset,
  normalizeRadiusPreset,
  normalizeSpacingPreset,
  normalizeTextScalePreset,
  normalizeWindowControlAlign,
  normalizeWindowControlStyle,
  RADIUS_PRESET_STORAGE_KEY,
  SPACING_PRESET_STORAGE_KEY,
  TEXT_SCALE_PRESET_STORAGE_KEY,
  WINDOW_CONTROL_ALIGN_STORAGE_KEY,
  WINDOW_CONTROL_STYLE_STORAGE_KEY,
  type AccentPreset,
  type FontPreset,
  type RadiusPreset,
  type SpacingPreset,
  type TextScalePreset,
  type WindowControlAlign,
  type WindowControlStyle,
} from "./themeTokens";

export type Theme = "dark" | "light";

/** Desktop = floating windows with titlebar chrome. App = full-screen apps without window controls. */
export type ShellView = "desktop" | "app";

/** Where app windows render in the desktop Electron shell. */
export type AppWindowHost = "embedded" | "native";

/** Auto-lock after idle input; `"never"` disables the timer (manual lock still works). */
export type IdleLockTimeout = "5m" | "15m" | "30m" | "1h" | "never";

export const IDLE_LOCK_TIMEOUT_OPTIONS: readonly {
  id: IdleLockTimeout;
  label: string;
  ms: number | null;
}[] = [
  { id: "5m", label: "5 minutes", ms: 5 * 60 * 1000 },
  { id: "15m", label: "15 minutes", ms: 15 * 60 * 1000 },
  { id: "30m", label: "30 minutes", ms: 30 * 60 * 1000 },
  { id: "1h", label: "1 hour", ms: 60 * 60 * 1000 },
  { id: "never", label: "Never", ms: null },
] as const;

const IDLE_LOCK_TIMEOUT_SET = new Set<string>(IDLE_LOCK_TIMEOUT_OPTIONS.map((o) => o.id));
const IDLE_LOCK_STORAGE_KEY = "arco:idle-lock";

export function normalizeIdleLockTimeout(raw: string | null | undefined): IdleLockTimeout {
  if (raw && IDLE_LOCK_TIMEOUT_SET.has(raw)) return raw as IdleLockTimeout;
  return "15m";
}

export function idleLockTimeoutMs(timeout: IdleLockTimeout): number | null {
  return IDLE_LOCK_TIMEOUT_OPTIONS.find((o) => o.id === timeout)?.ms ?? 15 * 60 * 1000;
}

export interface OsNotification {
  id: string;
  message: string;
  createdAt: number;
}

/**
 * An approval request from an agent turn with no chat stream attached
 * (voice conversations) — rendered as a desktop-level card instead of an
 * inline chat item. Cleared by the confirm_resolved shell event.
 */
export interface ShellConfirm {
  confirmId: string;
  command: string;
  options?: ConfirmOption[];
}

interface OsStore {
  theme: Theme;
  accentPreset: AccentPreset;
  radiusPreset: RadiusPreset;
  fontPreset: FontPreset;
  textScalePreset: TextScalePreset;
  spacingPreset: SpacingPreset;
  windowControlStyle: WindowControlStyle;
  windowControlAlign: WindowControlAlign;
  wallpaper: WallpaperId;
  authWallpaper: AuthWallpaperId;
  notifications: OsNotification[];
  apps: AppSummary[];
  webApps: WebApp[];
  installedApps: InstalledAppInfo[];
  agentBusy: boolean;
  /** Left nav rail: collapsed icon rail (false) vs expanded icon+label list (true). */
  navExpanded: boolean;
  /** Whether the left nav rail is shown at all (MenuBar drawer toggle). */
  navVisible: boolean;
  /** Which apps show on the nav rail, and in what order (windowKey ids). */
  navPinnedIds: string[];
  /** Which apps show on the dock, and in what order (windowKey ids) — independent from navPinnedIds. */
  dockPinnedIds: string[];
  shellConfirms: ShellConfirm[];
  /** Shell layout: desktop windows vs chromeless full-screen apps. */
  shellView: ShellView;
  /** Desktop app only: embed apps in the shell or open native Electron windows. */
  appWindowHost: AppWindowHost;
  /** Custom nav rail brand image (data URL). Null shows the default logo mark. */
  navBrandImage: string | null;
  /**
   * When true, developer/setup system apps appear in launchers
   * (Onboarding, Setup, Generator, Pay, Image Gen). Off by default.
   */
  developerApps: boolean;
  /**
   * When true, desktop windows may hang past the browser edge (titlebar
   * grab strip stays on-screen). When false, windows stay inside the viewport.
   */
  windowsOffscreen: boolean;
  /** Auto-lock after inactivity; `"never"` turns the idle timer off. */
  idleLockTimeout: IdleLockTimeout;

  setTheme: (theme: Theme) => void;
  setAccentPreset: (preset: AccentPreset) => void;
  setRadiusPreset: (preset: RadiusPreset) => void;
  setFontPreset: (preset: FontPreset) => void;
  setTextScalePreset: (preset: TextScalePreset) => void;
  setSpacingPreset: (preset: SpacingPreset) => void;
  setWindowControlStyle: (style: WindowControlStyle) => void;
  setWindowControlAlign: (align: WindowControlAlign) => void;
  setWallpaper: (wallpaper: WallpaperId) => void;
  setAuthWallpaper: (authWallpaper: AuthWallpaperId) => void;
  setNavBrandImage: (image: string | null) => void;
  notify: (message: string) => void;
  dismissNotification: (id: string) => void;
  refreshApps: () => Promise<void>;
  setAgentBusy: (busy: boolean) => void;
  setNavExpanded: (expanded: boolean) => void;
  setNavVisible: (visible: boolean) => void;
  setNavPinnedIds: (updater: string[] | ((prev: string[]) => string[])) => void;
  setDockPinnedIds: (updater: string[] | ((prev: string[]) => string[])) => void;
  setShellView: (view: ShellView) => void;
  setAppWindowHost: (host: AppWindowHost) => void;
  setDeveloperApps: (enabled: boolean) => void;
  setWindowsOffscreen: (enabled: boolean) => void;
  setIdleLockTimeout: (timeout: IdleLockTimeout) => void;
  addShellConfirm: (confirm: ShellConfirm) => void;
  removeShellConfirm: (confirmId: string) => void;
}

function loadPinnedIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) && parsed.every((id) => typeof id === "string") ? parsed : [];
  } catch {
    return [];
  }
}

const initialAccentPreset = normalizeAccentPreset(localStorage.getItem(ACCENT_PRESET_STORAGE_KEY));
const initialRadiusPreset = normalizeRadiusPreset(localStorage.getItem(RADIUS_PRESET_STORAGE_KEY));
const initialFontPreset = normalizeFontPreset(localStorage.getItem(FONT_PRESET_STORAGE_KEY));
const initialTextScalePreset = normalizeTextScalePreset(localStorage.getItem(TEXT_SCALE_PRESET_STORAGE_KEY));
const initialSpacingPreset = normalizeSpacingPreset(localStorage.getItem(SPACING_PRESET_STORAGE_KEY));
applyAccentPreset(initialAccentPreset);
applyRadiusPreset(initialRadiusPreset);
applyFontPreset(initialFontPreset);
applyTextScalePreset(initialTextScalePreset);
applySpacingPreset(initialSpacingPreset);

export const useOsStore = create<OsStore>((set) => ({
  theme: (localStorage.getItem("arco:theme") as Theme) || "dark",
  accentPreset: initialAccentPreset,
  radiusPreset: initialRadiusPreset,
  fontPreset: initialFontPreset,
  textScalePreset: initialTextScalePreset,
  spacingPreset: initialSpacingPreset,
  windowControlStyle: normalizeWindowControlStyle(localStorage.getItem(WINDOW_CONTROL_STYLE_STORAGE_KEY)),
  windowControlAlign: normalizeWindowControlAlign(localStorage.getItem(WINDOW_CONTROL_ALIGN_STORAGE_KEY)),
  wallpaper: normalizeWallpaper(localStorage.getItem("arco:wallpaper")),
  authWallpaper: normalizeAuthWallpaper(localStorage.getItem("arco:auth-wallpaper")),
  notifications: [],
  apps: [],
  webApps: [],
  installedApps: [],
  agentBusy: false,
  navExpanded: localStorage.getItem("arco:nav-expanded") === "true",
  navVisible: localStorage.getItem("arco:nav-visible") !== "false",
  navPinnedIds: loadPinnedIds("arco:nav-pinned"),
  dockPinnedIds: loadPinnedIds("arco:dock-pinned"),
  shellConfirms: [],
  shellView: localStorage.getItem("arco:shell-view") === "app" ? "app" : "desktop",
  appWindowHost: localStorage.getItem("arco:app-window-host") === "native" ? "native" : "embedded",
  navBrandImage: localStorage.getItem("arco:nav-brand-image"),
  developerApps: localStorage.getItem("arco:developer-apps") === "true",
  windowsOffscreen: localStorage.getItem("arco:windows-offscreen") !== "false",
  idleLockTimeout: normalizeIdleLockTimeout(localStorage.getItem(IDLE_LOCK_STORAGE_KEY)),

  setTheme: (theme) => {
    localStorage.setItem("arco:theme", theme);
    document.documentElement.dataset.theme = theme;
    void getArcoDesktop()?.setTitleBarTheme(theme);
    set({ theme });
  },

  setAccentPreset: (accentPreset) => {
    localStorage.setItem(ACCENT_PRESET_STORAGE_KEY, accentPreset);
    applyAccentPreset(accentPreset);
    set({ accentPreset });
  },

  setRadiusPreset: (radiusPreset) => {
    localStorage.setItem(RADIUS_PRESET_STORAGE_KEY, radiusPreset);
    applyRadiusPreset(radiusPreset);
    set({ radiusPreset });
  },

  setFontPreset: (fontPreset) => {
    localStorage.setItem(FONT_PRESET_STORAGE_KEY, fontPreset);
    applyFontPreset(fontPreset);
    set({ fontPreset });
  },

  setTextScalePreset: (textScalePreset) => {
    localStorage.setItem(TEXT_SCALE_PRESET_STORAGE_KEY, textScalePreset);
    applyTextScalePreset(textScalePreset);
    set({ textScalePreset });
  },

  setSpacingPreset: (spacingPreset) => {
    localStorage.setItem(SPACING_PRESET_STORAGE_KEY, spacingPreset);
    applySpacingPreset(spacingPreset);
    set({ spacingPreset });
  },

  setWindowControlStyle: (windowControlStyle) => {
    localStorage.setItem(WINDOW_CONTROL_STYLE_STORAGE_KEY, windowControlStyle);
    set({ windowControlStyle });
  },

  setWindowControlAlign: (windowControlAlign) => {
    localStorage.setItem(WINDOW_CONTROL_ALIGN_STORAGE_KEY, windowControlAlign);
    set({ windowControlAlign });
  },

  setWallpaper: (wallpaper) => {
    localStorage.setItem("arco:wallpaper", wallpaper);
    set({ wallpaper });
  },

  setAuthWallpaper: (authWallpaper) => {
    localStorage.setItem("arco:auth-wallpaper", authWallpaper);
    set({ authWallpaper });
  },

  setNavBrandImage: (image) => {
    if (image) localStorage.setItem("arco:nav-brand-image", image);
    else localStorage.removeItem("arco:nav-brand-image");
    set({ navBrandImage: image });
  },

  notify: (message) => {
    const id = crypto.randomUUID();
    set((s) => ({ notifications: [...s.notifications, { id, message, createdAt: Date.now() }] }));
    // Auto-dismiss after 6s.
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
    }, 6000);
  },

  dismissNotification: (id) => {
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
  },

  // One refresh covers all dock sections — every call site that knows about
  // generated apps changing also wants web-app and installed-app changes.
  refreshApps: async () => {
    try {
      const [apps, webApps, installedApps] = await Promise.all([
        api.listApps(),
        api.listWebApps(),
        api.listInstalledApps(),
      ]);
      set({ apps, webApps, installedApps });
    } catch {
      // Server unreachable — keep the stale lists.
    }
  },

  setAgentBusy: (busy) => set({ agentBusy: busy }),

  addShellConfirm: (confirm) =>
    set((s) =>
      s.shellConfirms.some((c) => c.confirmId === confirm.confirmId)
        ? s
        : { shellConfirms: [...s.shellConfirms, confirm] },
    ),

  removeShellConfirm: (confirmId) =>
    set((s) => ({ shellConfirms: s.shellConfirms.filter((c) => c.confirmId !== confirmId) })),

  setNavExpanded: (expanded) => {
    localStorage.setItem("arco:nav-expanded", String(expanded));
    set({ navExpanded: expanded });
  },

  setNavVisible: (visible) => {
    localStorage.setItem("arco:nav-visible", String(visible));
    set({ navVisible: visible });
  },

  setNavPinnedIds: (updater) =>
    set((s) => {
      const navPinnedIds = typeof updater === "function" ? updater(s.navPinnedIds) : updater;
      if (navPinnedIds === s.navPinnedIds) return s;
      localStorage.setItem("arco:nav-pinned", JSON.stringify(navPinnedIds));
      return { navPinnedIds };
    }),

  setDockPinnedIds: (updater) =>
    set((s) => {
      const dockPinnedIds = typeof updater === "function" ? updater(s.dockPinnedIds) : updater;
      if (dockPinnedIds === s.dockPinnedIds) return s;
      localStorage.setItem("arco:dock-pinned", JSON.stringify(dockPinnedIds));
      return { dockPinnedIds };
    }),

  setShellView: (shellView) => {
    localStorage.setItem("arco:shell-view", shellView);
    set({ shellView });
  },

  setAppWindowHost: (appWindowHost) => {
    localStorage.setItem("arco:app-window-host", appWindowHost);
    set({ appWindowHost });
  },

  setDeveloperApps: (developerApps) => {
    localStorage.setItem("arco:developer-apps", String(developerApps));
    set({ developerApps });
  },

  setWindowsOffscreen: (windowsOffscreen) => {
    localStorage.setItem("arco:windows-offscreen", String(windowsOffscreen));
    set({ windowsOffscreen });
  },

  setIdleLockTimeout: (idleLockTimeout) => {
    localStorage.setItem(IDLE_LOCK_STORAGE_KEY, idleLockTimeout);
    set({ idleLockTimeout });
  },
}));
