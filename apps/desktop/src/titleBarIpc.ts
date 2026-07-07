import { ipcMain, type BrowserWindow } from "electron";
import { DESKTOP_IPC, type TitleBarTheme } from "./ipc.js";
import { applyTitleBarTheme } from "./titleBar.js";

function isTitleBarTheme(value: unknown): value is TitleBarTheme {
  return value === "dark" || value === "light";
}

/** Keep native overlay controls in sync with the shell theme. */
export function registerTitleBarIpc(getWindows: () => BrowserWindow[]): void {
  ipcMain.handle(DESKTOP_IPC.setTitleBarTheme, (_event, theme: unknown) => {
    if (!isTitleBarTheme(theme)) return;
    for (const win of getWindows()) {
      if (!win.isDestroyed()) applyTitleBarTheme(win, theme);
    }
  });
}
