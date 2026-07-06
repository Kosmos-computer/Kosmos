import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, shell } from "electron";
import { desktopDataDir, repoRoot } from "./paths.js";
import { attachServerLogging, startServerProcess, waitForUrl } from "./serverProcess.js";

const DEV_SHELL = process.argv.includes("--dev");
const SERVER_PORT = Number(process.env.ARCO_PORT ?? 4600);
const DEV_URL = process.env.ARCO_DEV_URL ?? "http://localhost:4610";
const preloadPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "preload.js");

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

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: "Arco OS",
    backgroundColor: "#0b0d12",
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
      await ensureServer();
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
