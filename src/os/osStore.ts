/**
 * Shell-level state: theme, wallpaper, notifications, and the generated-app
 * list shared by the dock, the Apps library, and os_ui handling.
 */
import { create } from "zustand";
import type { AppSummary, WebApp } from "@shared/types";
import { api } from "../lib/api";

export type Theme = "dark" | "light";

export interface OsNotification {
  id: string;
  message: string;
  createdAt: number;
}

interface OsStore {
  theme: Theme;
  wallpaper: string;
  notifications: OsNotification[];
  apps: AppSummary[];
  webApps: WebApp[];
  agentBusy: boolean;
  /** Left nav rail: collapsed icon rail (false) vs expanded icon+label list (true). */
  navExpanded: boolean;

  setTheme: (theme: Theme) => void;
  setWallpaper: (wallpaper: string) => void;
  notify: (message: string) => void;
  dismissNotification: (id: string) => void;
  refreshApps: () => Promise<void>;
  setAgentBusy: (busy: boolean) => void;
  setNavExpanded: (expanded: boolean) => void;
}

export const useOsStore = create<OsStore>((set) => ({
  theme: (localStorage.getItem("arco:theme") as Theme) || "dark",
  wallpaper: localStorage.getItem("arco:wallpaper") || "aurora",
  notifications: [],
  apps: [],
  webApps: [],
  agentBusy: false,
  navExpanded: localStorage.getItem("arco:nav-expanded") === "true",

  setTheme: (theme) => {
    localStorage.setItem("arco:theme", theme);
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },

  setWallpaper: (wallpaper) => {
    localStorage.setItem("arco:wallpaper", wallpaper);
    set({ wallpaper });
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

  // One refresh covers both dock sections — every call site that knows about
  // generated apps changing also wants web-app registry changes.
  refreshApps: async () => {
    try {
      const [apps, webApps] = await Promise.all([api.listApps(), api.listWebApps()]);
      set({ apps, webApps });
    } catch {
      // Server unreachable — keep the stale lists.
    }
  },

  setAgentBusy: (busy) => set({ agentBusy: busy }),

  setNavExpanded: (expanded) => {
    localStorage.setItem("arco:nav-expanded", String(expanded));
    set({ navExpanded: expanded });
  },
}));
