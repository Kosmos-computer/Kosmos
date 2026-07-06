/**
 * Renderer bridge to the Electron desktop shell — no-op in the browser.
 */
import { DESKTOP_IPC, type OpenAppWindowPayload } from "@shared/desktopBridge";

export interface ArcoDesktopBridge {
  isDesktop: true;
  platform: string;
  openAppWindow: (payload: OpenAppWindowPayload) => Promise<void>;
  closeAppWindow: (id: string) => Promise<void>;
  focusAppWindow: (id: string) => Promise<void>;
  closeAllAppWindows: () => Promise<void>;
  onAppWindowClosed: (handler: (id: string) => void) => () => void;
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
