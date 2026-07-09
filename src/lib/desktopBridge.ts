/**
 * Renderer bridge to native shells — delegates to @arco/platform-bridge.
 * Electron preload still exposes window.arcoDesktop; Tauri uses invoke.
 */
import { DESKTOP_IPC, type OpenAppWindowPayload, type TitleBarTheme } from "@shared/desktopBridge";
import { getPlatformBridge, isDesktopShell } from "@arco/platform-bridge";
import type { DesktopUpdateState } from "@shared/desktopUpdate";

export interface ArcoDesktopBridge {
  isDesktop: true;
  platform: string;
  version: string;
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
  installUpdate: () => Promise<DesktopUpdateState>;
  remindLaterUpdate: (version?: string) => Promise<DesktopUpdateState>;
  skipUpdate: (version?: string) => Promise<DesktopUpdateState>;
  onUpdateStateChanged: (handler: (state: DesktopUpdateState) => void) => () => void;
}

export function isArcoDesktop(): boolean {
  return isDesktopShell() && getPlatformBridge().desktop !== null;
}

export function getArcoDesktop(): ArcoDesktopBridge | null {
  const bridge = getPlatformBridge();
  const desktop = bridge.desktop;
  if (!isDesktopShell() || !desktop) return null;

  const legacy = window.arcoDesktop as ArcoDesktopBridge | undefined;
  const updates = legacy
    ? {
        getUpdateState: () => legacy.getUpdateState(),
        checkForUpdates: () => legacy.checkForUpdates(),
        installUpdate: () => legacy.installUpdate(),
        remindLaterUpdate: (version?: string) => legacy.remindLaterUpdate(version),
        skipUpdate: (version?: string) => legacy.skipUpdate(version),
        onUpdateStateChanged: (handler: (state: DesktopUpdateState) => void) =>
          legacy.onUpdateStateChanged(handler),
      }
    : {
        getUpdateState: async () => ({ status: "idle" as const, currentVersion: bridge.config.version }),
        checkForUpdates: async () => ({ status: "idle" as const, currentVersion: bridge.config.version }),
        installUpdate: async () => ({ status: "idle" as const, currentVersion: bridge.config.version }),
        remindLaterUpdate: async () => ({ status: "idle" as const, currentVersion: bridge.config.version }),
        skipUpdate: async () => ({ status: "idle" as const, currentVersion: bridge.config.version }),
        onUpdateStateChanged: () => () => {},
      };

  return {
    isDesktop: true,
    platform: bridge.config.os,
    version: bridge.config.version,
    openAppWindow: (payload) => desktop.openAppWindow(payload),
    closeAppWindow: (id) => desktop.closeAppWindow(id),
    focusAppWindow: (id) => desktop.focusAppWindow(id),
    closeAllAppWindows: () => desktop.closeAllAppWindows(),
    setTitleBarTheme: (theme) => desktop.setTitleBarTheme(theme),
    minimizeWindow: () => desktop.minimizeWindow(),
    maximizeWindow: () => desktop.maximizeWindow(),
    closeWindow: () => desktop.closeWindow(),
    onAppWindowClosed: (handler) => desktop.onAppWindowClosed(handler),
    ...updates,
  };
}

declare global {
  interface Window {
    arcoDesktop?: ArcoDesktopBridge;
  }
}

export { DESKTOP_IPC };
export { UPDATE_IPC, type DesktopUpdateState, type UpdateStatus } from "@shared/desktopUpdate";
