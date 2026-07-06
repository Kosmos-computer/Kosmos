/**
 * Shell-level state: theme, wallpaper, notifications, and the generated-app
 * list shared by the dock, the Apps library, and os_ui handling.
 */
import { create } from "zustand";
import type { AppSummary, ConfirmOption, WebApp } from "@shared/types";
import type { InstalledAppInfo } from "@shared/manifest";
import { api } from "../lib/api";
import { normalizeWallpaper, type WallpaperId } from "./wallpaper/wallpapers";
import { normalizeAuthWallpaper, type AuthWallpaperId } from "./wallpaper/authWallpapers";

export type Theme = "dark" | "light";

/** Desktop = floating windows with titlebar chrome. App = full-screen apps without window controls. */
export type ShellView = "desktop" | "app";

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
  wallpaper: WallpaperId;
  authWallpaper: AuthWallpaperId;
  notifications: OsNotification[];
  apps: AppSummary[];
  webApps: WebApp[];
  installedApps: InstalledAppInfo[];
  agentBusy: boolean;
  /** Left nav rail: collapsed icon rail (false) vs expanded icon+label list (true). */
  navExpanded: boolean;
  /** Which apps show on the nav rail, and in what order (windowKey ids). */
  navPinnedIds: string[];
  /** Which apps show on the dock, and in what order (windowKey ids) — independent from navPinnedIds. */
  dockPinnedIds: string[];
  shellConfirms: ShellConfirm[];
  /** Shell layout: desktop windows vs chromeless full-screen apps. */
  shellView: ShellView;

  setTheme: (theme: Theme) => void;
  setWallpaper: (wallpaper: WallpaperId) => void;
  setAuthWallpaper: (authWallpaper: AuthWallpaperId) => void;
  notify: (message: string) => void;
  dismissNotification: (id: string) => void;
  refreshApps: () => Promise<void>;
  setAgentBusy: (busy: boolean) => void;
  setNavExpanded: (expanded: boolean) => void;
  setNavPinnedIds: (updater: string[] | ((prev: string[]) => string[])) => void;
  setDockPinnedIds: (updater: string[] | ((prev: string[]) => string[])) => void;
  setShellView: (view: ShellView) => void;
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

export const useOsStore = create<OsStore>((set) => ({
  theme: (localStorage.getItem("arco:theme") as Theme) || "dark",
  wallpaper: normalizeWallpaper(localStorage.getItem("arco:wallpaper")),
  authWallpaper: normalizeAuthWallpaper(localStorage.getItem("arco:auth-wallpaper")),
  notifications: [],
  apps: [],
  webApps: [],
  installedApps: [],
  agentBusy: false,
  navExpanded: localStorage.getItem("arco:nav-expanded") === "true",
  navPinnedIds: loadPinnedIds("arco:nav-pinned"),
  dockPinnedIds: loadPinnedIds("arco:dock-pinned"),
  shellConfirms: [],
  shellView: localStorage.getItem("arco:shell-view") === "app" ? "app" : "desktop",

  setTheme: (theme) => {
    localStorage.setItem("arco:theme", theme);
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },

  setWallpaper: (wallpaper) => {
    localStorage.setItem("arco:wallpaper", wallpaper);
    set({ wallpaper });
  },

  setAuthWallpaper: (authWallpaper) => {
    localStorage.setItem("arco:auth-wallpaper", authWallpaper);
    set({ authWallpaper });
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
}));
