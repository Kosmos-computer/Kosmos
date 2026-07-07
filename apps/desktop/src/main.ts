import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, nativeImage, shell } from "electron";
import { registerAppWindowIpc } from "./appWindows.js";
import { appIconPath, desktopDataDir, repoRoot } from "./paths.js";
import { attachServerLogging, startServerProcess, waitForUrl } from "./serverProcess.js";
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

function shellUrl(): string {
  return DEV_SHELL ? DEV_URL : `http://127.0.0.1:${SERVER_PORT}`;
}

async function ensureServer(): Promise<void> {
  if (DEV_SHELL) {
    await waitForUrl(DEV_URL);
    return;
  }

  const root = repoRoot();
  const dataDir = desktopDataDir();
  serverProcess = startServerProcess({ root, port: SERVER_PORT, dataDir });
  attachServerLogging(serverProcess);

  serverProcess.on("exit", (code, signal) => {
    if (!quitting) {
      console.error(`[arco-desktop] server exited (code=${code}, signal=${signal})`);
      app.quit();
    }
  });

  await waitForUrl(`http://127.0.0.1:${SERVER_PORT}/api/settings`);
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
    title: "Arco OS",
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
      createWindow();
    } catch (err) {
      console.error("[arco-desktop] failed to start:", err);
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
