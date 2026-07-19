/**
 * Window actions for AppHoverCard — shared by Dock and NavRail.
 */
import type { OsWindow } from "./windowStore";
import type { AppHoverCardActionHandlers } from "./appHoverCardData";

export function appHoverCardHandlers(
  appId: string,
  windows: OsWindow[],
  actions: {
    onLaunch: () => void;
    onFocus: (windowId: string) => void;
    onMinimize: (windowId: string) => void;
    onClose: (windowId: string) => void;
    onRemove?: () => void;
  },
): AppHoverCardActionHandlers {
  const appWindows = () => windows.filter((window) => window.id === appId);
  const openWindows = () => appWindows().filter((window) => !window.minimized);

  return {
    onNewWindow: actions.onLaunch,
    onNewPrivateWindow: actions.onLaunch,
    onShowAllWindows: () => {
      const visible = openWindows();
      if (visible[0]) actions.onFocus(visible[0].id);
      else actions.onLaunch();
    },
    onHide: () => {
      openWindows().forEach((window) => actions.onMinimize(window.id));
    },
    onQuit: () => {
      appWindows().forEach((window) => actions.onClose(window.id));
    },
    onRemove: actions.onRemove,
  };
}
