/**
 * Action handlers for the shell app hovercard — window controls for one app.
 */

export interface AppHoverCardActionHandlers {
  onOpen?: () => void;
  onShow?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
  /** Spawn another window (Drive and other multi-instance apps). */
  onNewWindow?: () => void;
  onRemove?: () => void;
}

/** Per-app window snapshot used to build the hovercard menu. */
export interface AppHoverWindowState {
  /** App has a window in the store (open or minimized). */
  isOpen: boolean;
  /** Window is visible and not minimized. */
  isVisible: boolean;
  /** Window is currently focused (topmost visible). */
  isActive: boolean;
  /** Window is maximized. */
  isMaximized: boolean;
}
