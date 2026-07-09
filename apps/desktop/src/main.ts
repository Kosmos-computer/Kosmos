import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, nativeImage, shell } from "electron";
import { registerAppWindowIpc } from "./appWindows.js";
import { registerAutoUpdateIpc } from "./autoUpdateIpc.js";
import { autoUpdateService } from "./autoUpdate.js";
import { appIconPath, desktopDataDir, repoRoot } from "./paths.js";
import { attachServerLogging, resolveServerPort, startServerProcess, waitForUrl } from "./serverProcess.js";
import { registerTitleBarIpc } from "./titleBarIpc.js";
import { registerWindowControlsIpc } from "./windowControlsIpc.js";
import { titleBarWindowOptions } from "./titleBar.js";

const DEV_SHELL = process.argv.includes("--dev");
const SERVER_PORT = Number(process.env.ARCO_PORT ?? 4600);
const DEV_URL = process.env.ARCO_DEV_URL ?? "http://localhost:4610";
const preloadPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "preload.cjs");

let mainWindow: BrowserWindow | null = null;
let serverProcess: ReturnType<typeof startServerProcess> | null = null;
let quitting = false;
let activeServerPort = SERVER_PORT;

function shellUrl(): string {
  return DEV_SHELL ? DEV_URL : `http://127.0.0.1:${activeServerPort}`;
}

async function showStartupError(title: string, detail: string): Promise<void> {
  await dialog.showMessageBox({
    type: "error",
    title: "Kosmos",
    message: title,
    detail,
    buttons: ["Quit"],
  });
}

async function ensureServer(): Promise<void> {
  if (DEV_SHELL) {
    await waitForUrl(DEV_URL);
    return;
  }

  const root = repoRoot();
  const dataDir = desktopDataDir();
  activeServerPort = await resolveServerPort(SERVER_PORT);
  if (activeServerPort !== SERVER_PORT) {
    console.warn(
      `[arco-desktop] port ${SERVER_PORT} is in use; starting backend on ${activeServerPort}`,
    );
  }
  serverProcess = startServerProcess({
    root,
    port: activeServerPort,
    dataDir,
    nodeExecutable: process.execPath,
    packaged: app.isPackaged,
  });
  attachServerLogging(serverProcess);

  serverProcess.on("exit", (code, signal) => {
    if (!quitting) {
      const detail = `The backend exited unexpectedly (code=${code ?? "null"}, signal=${signal ?? "null"}).`;
      console.error(`[arco-desktop] server exited (code=${code}, signal=${signal})`);
      void showStartupError("The Arco backend stopped unexpectedly.", detail).then(() => app.quit());
    }
  });

  try {
    await waitForUrl(`http://127.0.0.1:${activeServerPort}/api/settings`);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`The Arco backend did not start in time.\n\n${detail}`);
  }
}

function applyAppIcon(): void {
  const icon = nativeImage.createFromPath(appIconPath());
  if (icon.isEmpty()) return;
  if (process.platform === "darwin" && app.dock) app.dock.setIcon(icon);
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: "Kosmos",
    icon: appIconPath(),
    ...titleBarWindowOptions("dark"),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  void mainWindow.loadURL(shellUrl());

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function stopServer(): void {
  if (!serverProcess || serverProcess.killed) return;
  serverProcess.kill("SIGTERM");
  serverProcess = null;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      applyAppIcon();
      await ensureServer();
      registerAppWindowIpc(
        shellUrl,
        () => preloadPath,
        () => mainWindow,
      );
      registerTitleBarIpc(() => {
        const windows = BrowserWindow.getAllWindows().filter((win) => !win.isDestroyed());
        return windows;
      });
      registerWindowControlsIpc();
      registerAutoUpdateIpc();
      autoUpdateService.init(() => BrowserWindow.getAllWindows().filter((win) => !win.isDestroyed()));
      createWindow();
    } catch (err) {
      console.error("[arco-desktop] failed to start:", err);
      const detail = err instanceof Error ? err.message : String(err);
      await showStartupError("Kosmos failed to start.", detail);
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on("before-quit", () => {
    quitting = true;
    stopServer();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
