import { contextBridge, ipcRenderer } from "electron";
import { DESKTOP_IPC, type OpenAppWindowPayload } from "./ipc.js";

contextBridge.exposeInMainWorld("arcoDesktop", {
  isDesktop: true,
  platform: process.platform,
  openAppWindow: (payload: OpenAppWindowPayload) => ipcRenderer.invoke(DESKTOP_IPC.openAppWindow, payload),
  closeAppWindow: (id: string) => ipcRenderer.invoke(DESKTOP_IPC.closeAppWindow, id),
  focusAppWindow: (id: string) => ipcRenderer.invoke(DESKTOP_IPC.focusAppWindow, id),
  closeAllAppWindows: () => ipcRenderer.invoke(DESKTOP_IPC.closeAllAppWindows),
  onAppWindowClosed: (handler: (id: string) => void) => {
    const listener = (_event: unknown, id: string) => handler(id);
    ipcRenderer.on(DESKTOP_IPC.appWindowClosed, listener);
    return () => ipcRenderer.removeListener(DESKTOP_IPC.appWindowClosed, listener);
  },
});
