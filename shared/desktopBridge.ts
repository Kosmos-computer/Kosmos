/** IPC contract between the Electron main process and the Arco shell renderer. */

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
  computerScreenshot: "arco:computer-screenshot",
  computerClick: "arco:computer-click",
  computerType: "arco:computer-type",
  /** Design Mode: arm/disarm guest overlay on a webview webContents id. */
  browserSetGrabMode: "arco:browser-set-grab-mode",
  /** Design Mode: wait for element click; returns BrowserGrabPayload (no screenshot). */
  browserAwaitGrab: "arco:browser-await-grab",
  /** Design Mode: capture cropped PNG of the selected rect. */
  browserCaptureCrop: "arco:browser-capture-crop",
} as const;

export type TitleBarTheme = "dark" | "light";

export interface OpenAppWindowPayload {
  id: string;
  title: string;
}
