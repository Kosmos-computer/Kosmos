/**
 * Design Mode IPC — setGrabMode / awaitGrab / captureCrop against a guest
 * webview's webContents id (Orca-style main-process grab).
 */
import { ipcMain, webContents } from "electron";
import { DESKTOP_IPC } from "./ipc.js";
import {
  grabArmScript,
  grabAwaitArmedScript,
  grabTeardownScript,
} from "./browser/grabGuestScript.js";

export interface CaptureCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function guest(webContentsId: number) {
  const wc = webContents.fromId(webContentsId);
  if (!wc || wc.isDestroyed()) {
    throw new Error(`No webview webContents for id ${webContentsId}`);
  }
  return wc;
}

export function registerBrowserGrabIpc(): void {
  ipcMain.handle(DESKTOP_IPC.browserSetGrabMode, async (_e, webContentsId: number, enabled: boolean) => {
    const wc = guest(webContentsId);
    if (enabled) {
      await wc.executeJavaScript(grabArmScript(), true);
    } else {
      await wc.executeJavaScript(grabTeardownScript(), true);
    }
    return { ok: true };
  });

  ipcMain.handle(DESKTOP_IPC.browserAwaitGrab, async (_e, webContentsId: number) => {
    const wc = guest(webContentsId);
    await wc.executeJavaScript(grabArmScript(), true);
    const payload = await wc.executeJavaScript(grabAwaitArmedScript(), true);
    return payload;
  });

  ipcMain.handle(
    DESKTOP_IPC.browserCaptureCrop,
    async (_e, webContentsId: number, rect: CaptureCropRect) => {
      const wc = guest(webContentsId);
      await wc.executeJavaScript(grabTeardownScript(), true).catch(() => undefined);
      const pad = 4;
      const x = Math.max(0, Math.floor(rect.x - pad));
      const y = Math.max(0, Math.floor(rect.y - pad));
      const width = Math.max(1, Math.ceil(rect.width + pad * 2));
      const height = Math.max(1, Math.ceil(rect.height + pad * 2));
      const image = await wc.capturePage({ x, y, width, height });
      const size = image.getSize();
      return {
        mimeType: "image/png" as const,
        dataUrl: image.toDataURL(),
        width: size.width,
        height: size.height,
      };
    },
  );
}
