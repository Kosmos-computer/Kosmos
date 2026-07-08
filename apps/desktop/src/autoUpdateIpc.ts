import { ipcMain } from "electron";
import { UPDATE_IPC } from "./ipc.js";
import { autoUpdateService } from "./autoUpdate.js";

export function registerAutoUpdateIpc(): void {
  ipcMain.handle(UPDATE_IPC.getState, () => autoUpdateService.getState());
  ipcMain.handle(UPDATE_IPC.check, () => autoUpdateService.checkForUpdates({ clearSnooze: true }));
  ipcMain.handle(UPDATE_IPC.install, () => {
    autoUpdateService.installUpdate();
  });
  ipcMain.handle(UPDATE_IPC.remindLater, (_event, version: unknown) => {
    autoUpdateService.remindLaterUpdate(typeof version === "string" ? version : undefined);
  });
  ipcMain.handle(UPDATE_IPC.skip, (_event, version: unknown) => {
    autoUpdateService.skipUpdate(typeof version === "string" ? version : undefined);
  });
}
