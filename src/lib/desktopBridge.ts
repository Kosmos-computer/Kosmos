/**
 * Renderer bridge to the Electron desktop shell — no-op in the browser.
 */
import { DESKTOP_IPC, type OpenAppWindowPayload, type TitleBarTheme } from "@shared/desktopBridge";
import type { DesktopUpdateState } from "@shared/desktopUpdate";

export interface ArcoDesktopBridge {
  isDesktop: true;
  platform: string;
  openAppWindow: (payload: OpenAppWindowPayload) => Promise<void>;
  closeAppWindow: (id: string) => Promise<void>;
  focusAppWindow: (id: string) => Promise<void>;
  closeAllAppWindows: () => Promise<void>;
  setTitleBarTheme: (theme: TitleBarTheme) => Promise<void>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  onAppWindowClosed: (handler: (id: string) => void) => () => void;
  getUpdateState: () => Promise<DesktopUpdateState>;
  checkForUpdates: () => Promise<DesktopUpdateState>;
  installUpdate: () => Promise<void>;
  remindLaterUpdate: (version?: string) => Promise<void>;
  skipUpdate: (version?: string) => Promise<void>;
  onUpdateStateChanged: (handler: (state: DesktopUpdateState) => void) => () => void;
}

export function isArcoDesktop(): boolean {
  return typeof window !== "undefined" && window.arcoDesktop?.isDesktop === true;
}

export function getArcoDesktop(): ArcoDesktopBridge | null {
  return isArcoDesktop() ? window.arcoDesktop! : null;
}

declare global {
  interface Window {
    arcoDesktop?: ArcoDesktopBridge;
  }
}

export { DESKTOP_IPC };
export { UPDATE_IPC, type DesktopUpdateState, type UpdateStatus } from "@shared/desktopUpdate";
