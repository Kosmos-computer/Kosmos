/**
 * Window actions for AppHoverCard — shared by Dock and NavRail.
 * Most apps have one window per app id; Drive may have multiple instances.
 */
import type { AppHoverCardActionHandlers, AppHoverWindowState } from "./appHoverCardData";
import {
  findAppWindows,
  findFrontmostAppWindow,
  type OsWindow,
} from "./windowStore";

export function getAppHoverWindowState(
  appId: string,
  windows: OsWindow[],
  focusedId?: string | null,
): AppHoverWindowState {
  const appWindows = findAppWindows(windows, appId);
  const frontmost = findFrontmostAppWindow(windows, appId);
  const isOpen = appWindows.length > 0;
  const isVisible = appWindows.some((win) => !win.minimized);
  const isActive = Boolean(
    frontmost && !frontmost.minimized && focusedId === frontmost.id,
  );
  const isMaximized = Boolean(frontmost?.maximized);
  return { isOpen, isVisible, isActive, isMaximized };
}

export function appHoverCardHandlers(
  appId: string,
  windows: OsWindow[],
  actions: {
    onLaunch: () => void;
    onFocus: (windowId: string) => void;
    onMinimize: (windowId: string) => void;
    onMaximize: (windowId: string) => void;
    onClose: (windowId: string) => void;
    onNewWindow?: () => void;
    onRemove?: () => void;
  },
): AppHoverCardActionHandlers {
  const frontmost = () => findFrontmostAppWindow(windows, appId);

  return {
    onOpen: actions.onLaunch,
    onShow: () => {
      const current = frontmost();
      if (current) actions.onFocus(current.id);
      else actions.onLaunch();
    },
    onMinimize: () => {
      const current = frontmost();
      if (current && !current.minimized) actions.onMinimize(current.id);
    },
    onMaximize: () => {
      const current = frontmost();
      if (current && !current.minimized) actions.onMaximize(current.id);
    },
    onClose: () => {
      const current = frontmost();
      if (current) actions.onClose(current.id);
    },
    onNewWindow: actions.onNewWindow,
    onRemove: actions.onRemove,
  };
}
