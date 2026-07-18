import { BrowserWindow, ipcMain, shell } from "electron";
import { DESKTOP_IPC, type OpenAppWindowPayload } from "./ipc.js";
import { appIconPath } from "./paths.js";
import { titleBarWindowOptions } from "./titleBar.js";

const appWindows = new Map<string, BrowserWindow>();

export function registerAppWindowIpc(
  getShellUrl: () => string,
  getPreloadPath: () => string,
  getMainWindow: () => BrowserWindow | null,
): void {
  ipcMain.handle(DESKTOP_IPC.openAppWindow, (_event, payload: OpenAppWindowPayload) => {
    openAppWindow(payload, getShellUrl(), getPreloadPath(), getMainWindow());
  });

  ipcMain.handle(DESKTOP_IPC.closeAppWindow, (_event, id: string) => {
    closeAppWindow(id);
  });

  ipcMain.handle(DESKTOP_IPC.focusAppWindow, (_event, id: string) => {
    focusAppWindow(id);
  });

  ipcMain.handle(DESKTOP_IPC.closeAllAppWindows, () => {
    closeAllAppWindows();
  });
}

function openAppWindow(
  { id, title }: OpenAppWindowPayload,
  shellUrl: string,
  preloadPath: string,
  mainWindow: BrowserWindow | null,
): void {
  const existing = appWindows.get(id);
  if (existing && !existing.isDestroyed()) {
    if (existing.isMinimized()) existing.restore();
    existing.focus();
    return;
  }

  const win = new BrowserWindow({
    width: 960,
    height: 660,
    minWidth: 400,
    minHeight: 300,
    title,
    icon: appIconPath(),
    ...titleBarWindowOptions("dark"),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  const url = new URL(shellUrl);
  url.searchParams.set("arcoWindow", id);
  void win.loadURL(url.toString());

  win.on("closed", () => {
    appWindows.delete(id);
    mainWindow?.webContents.send(DESKTOP_IPC.appWindowClosed, id);
  });

  appWindows.set(id, win);
}

function closeAppWindow(id: string): void {
  const win = appWindows.get(id);
  if (!win || win.isDestroyed()) return;
  win.close();
}

function focusAppWindow(id: string): void {
  const win = appWindows.get(id);
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.focus();
}

function closeAllAppWindows(): void {
  for (const win of appWindows.values()) {
    if (!win.isDestroyed()) win.close();
  }
  appWindows.clear();
}
