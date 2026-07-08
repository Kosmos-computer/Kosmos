/** IPC channel names — keep in sync with shared/desktopBridge.ts. */

export const DESKTOP_IPC = {
  openAppWindow: "arco:open-app-window",
  closeAppWindow: "arco:close-app-window",
  focusAppWindow: "arco:focus-app-window",
  closeAllAppWindows: "arco:close-all-app-windows",
  appWindowClosed: "arco:app-window-closed",
  setTitleBarTheme: "arco:set-title-bar-theme",
  minimizeWindow: "arco:minimize-window",
  maximizeWindow: "arco:maximize-window",
  closeWindow: "arco:close-window",
} as const;

export type TitleBarTheme = "dark" | "light";

export interface OpenAppWindowPayload {
  id: string;
  title: string;
}

export const UPDATE_IPC = {
  getState: "arco:update-get-state",
  check: "arco:update-check",
  install: "arco:update-install",
  remindLater: "arco:update-remind-later",
  skip: "arco:update-skip",
  stateChanged: "arco:update-state-changed",
} as const;

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "ready"
  | "error";

export type UpdateSuppressed = "none" | "snooze" | "skip";

export interface DesktopUpdateState {
  status: UpdateStatus;
  currentVersion: string;
  version?: string;
  releaseNotes?: string;
  progress?: number;
  error?: string;
  downloaded?: boolean;
  suppressed?: UpdateSuppressed;
  remindAfter?: number;
}
