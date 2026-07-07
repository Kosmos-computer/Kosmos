import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron";
import { DESKTOP_IPC } from "./ipc.js";

function senderWindow(event: IpcMainInvokeEvent): BrowserWindow | null {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win && !win.isDestroyed() ? win : null;
}

export function registerWindowControlsIpc(): void {
  ipcMain.handle(DESKTOP_IPC.minimizeWindow, (event) => {
    senderWindow(event)?.minimize();
  });

  ipcMain.handle(DESKTOP_IPC.maximizeWindow, (event) => {
    const win = senderWindow(event);
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  ipcMain.handle(DESKTOP_IPC.closeWindow, (event) => {
    senderWindow(event)?.close();
  });
}
