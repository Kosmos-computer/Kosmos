import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("arcoDesktop", {
  platform: process.platform,
});
