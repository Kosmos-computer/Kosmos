import { contextBridge, ipcRenderer } from "electron";
import { DESKTOP_IPC, UPDATE_IPC, type OpenAppWindowPayload, type TitleBarTheme } from "./ipc.js";
import type { DesktopUpdateState } from "./ipc.js";

contextBridge.exposeInMainWorld("arcoDesktop", {
  isDesktop: true,
  platform: process.platform,
  openAppWindow: (payload: OpenAppWindowPayload) => ipcRenderer.invoke(DESKTOP_IPC.openAppWindow, payload),
  closeAppWindow: (id: string) => ipcRenderer.invoke(DESKTOP_IPC.closeAppWindow, id),
  focusAppWindow: (id: string) => ipcRenderer.invoke(DESKTOP_IPC.focusAppWindow, id),
  closeAllAppWindows: () => ipcRenderer.invoke(DESKTOP_IPC.closeAllAppWindows),
  setTitleBarTheme: (theme: TitleBarTheme) => ipcRenderer.invoke(DESKTOP_IPC.setTitleBarTheme, theme),
  minimizeWindow: () => ipcRenderer.invoke(DESKTOP_IPC.minimizeWindow),
  maximizeWindow: () => ipcRenderer.invoke(DESKTOP_IPC.maximizeWindow),
  closeWindow: () => ipcRenderer.invoke(DESKTOP_IPC.closeWindow),
  onAppWindowClosed: (handler: (id: string) => void) => {
    const listener = (_event: unknown, id: string) => handler(id);
    ipcRenderer.on(DESKTOP_IPC.appWindowClosed, listener);
    return () => ipcRenderer.removeListener(DESKTOP_IPC.appWindowClosed, listener);
  },
  getUpdateState: () => ipcRenderer.invoke(UPDATE_IPC.getState) as Promise<DesktopUpdateState>,
  checkForUpdates: () => ipcRenderer.invoke(UPDATE_IPC.check) as Promise<DesktopUpdateState>,
  installUpdate: () => ipcRenderer.invoke(UPDATE_IPC.install) as Promise<void>,
  remindLaterUpdate: (version?: string) => ipcRenderer.invoke(UPDATE_IPC.remindLater, version) as Promise<void>,
  skipUpdate: (version?: string) => ipcRenderer.invoke(UPDATE_IPC.skip, version) as Promise<void>,
  onUpdateStateChanged: (handler: (state: DesktopUpdateState) => void) => {
    const listener = (_event: unknown, state: DesktopUpdateState) => handler(state);
    ipcRenderer.on(UPDATE_IPC.stateChanged, listener);
    return () => ipcRenderer.removeListener(UPDATE_IPC.stateChanged, listener);
  },
});
