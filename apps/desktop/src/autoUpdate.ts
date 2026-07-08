import { app, type BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";
import { UPDATE_IPC, type DesktopUpdateState, type UpdateStatus } from "./ipc.js";
import {
  clearSnooze,
  getSnoozeUntil,
  isUpdateBlocked,
  isVersionSkipped,
  isVersionSnoozed,
  skipVersion,
  snoozeVersion,
  SNOOZE_DURATION_MS,
} from "./updatePreferencesStore.js";

const STARTUP_DELAY_MS = 30_000;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const SNOOZE_POLL_MS = 60_000;

function formatReleaseNotes(notes: unknown): string | undefined {
  if (!notes) return undefined;
  if (typeof notes === "string") return notes.trim() || undefined;
  if (Array.isArray(notes)) {
    const text = notes
      .map((entry) => (typeof entry === "string" ? entry : entry?.note))
      .filter(Boolean)
      .join("\n\n");
    return text.trim() || undefined;
  }
  return undefined;
}

function isEnabled(): boolean {
  return app.isPackaged && !process.argv.includes("--dev");
}

interface PendingUpdate {
  version: string;
  releaseNotes?: string;
  downloaded: boolean;
  progress?: number;
}

export class AutoUpdateService {
  private pending: PendingUpdate | null = null;
  private activeStatus: UpdateStatus = "idle";
  private error: string | undefined;
  private getWindows: () => BrowserWindow[] = () => [];
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private snoozeTimer: ReturnType<typeof setInterval> | null = null;

  init(getWindows: () => BrowserWindow[]): void {
    this.getWindows = getWindows;
    if (!isEnabled()) return;

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.disableWebInstaller = false;

    const feedUrl = process.env.ARCO_UPDATE_FEED_URL?.trim();
    if (feedUrl) {
      autoUpdater.setFeedURL({ provider: "generic", url: feedUrl.replace(/\/$/, "") });
    }

    autoUpdater.on("checking-for-update", () => {
      this.activeStatus = "checking";
      this.error = undefined;
      this.broadcast();
    });

    autoUpdater.on("update-available", (info) => {
      if (isVersionSkipped(info.version)) return;
      this.pending = {
        version: info.version,
        releaseNotes: formatReleaseNotes(info.releaseNotes),
        downloaded: false,
        progress: 0,
      };
      this.activeStatus = this.shouldShowModal(info.version) ? "available" : "idle";
      this.error = undefined;
      this.broadcast();
    });

    autoUpdater.on("update-not-available", () => {
      this.pending = null;
      this.activeStatus = "not-available";
      this.error = undefined;
      this.broadcast();
    });

    autoUpdater.on("download-progress", (progress) => {
      if (!this.pending || isVersionSkipped(this.pending.version)) return;
      this.pending = {
        ...this.pending,
        progress: Math.max(0, Math.min(100, progress.percent)),
      };
      this.activeStatus = this.shouldShowModal(this.pending.version) ? "downloading" : "idle";
      this.broadcast();
    });

    autoUpdater.on("update-downloaded", (info) => {
      if (isVersionSkipped(info.version)) return;
      this.pending = {
        version: info.version,
        releaseNotes: formatReleaseNotes(info.releaseNotes),
        downloaded: true,
        progress: 100,
      };
      this.activeStatus = this.shouldShowModal(info.version) ? "ready" : "idle";
      this.error = undefined;
      this.broadcast();
    });

    autoUpdater.on("error", (err) => {
      console.error("[arco-desktop] auto-update error:", err);
      this.activeStatus = "error";
      this.error = err instanceof Error ? err.message : String(err);
      this.broadcast();
    });

    setTimeout(() => {
      void this.checkForUpdates();
    }, STARTUP_DELAY_MS);

    this.checkTimer = setInterval(() => {
      void this.checkForUpdates();
    }, CHECK_INTERVAL_MS);

    this.snoozeTimer = setInterval(() => {
      this.refreshAfterSnooze();
    }, SNOOZE_POLL_MS);
  }

  dispose(): void {
    if (this.checkTimer) clearInterval(this.checkTimer);
    if (this.snoozeTimer) clearInterval(this.snoozeTimer);
    this.checkTimer = null;
    this.snoozeTimer = null;
  }

  getState(): DesktopUpdateState {
    return this.buildState();
  }

  async checkForUpdates(options?: { clearSnooze?: boolean }): Promise<DesktopUpdateState> {
    if (!isEnabled()) return this.buildState();
    if (options?.clearSnooze && this.pending?.version) {
      clearSnooze(this.pending.version);
    }
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[arco-desktop] checkForUpdates failed:", message);
      this.activeStatus = "error";
      this.error = message;
      this.broadcast();
    }
    return this.buildState();
  }

  installUpdate(): void {
    if (!isEnabled() || !this.pending?.downloaded) return;
    autoUpdater.quitAndInstall(false, true);
  }

  remindLaterUpdate(version?: string): void {
    const target = version ?? this.pending?.version;
    if (!target) return;
    snoozeVersion(target, Date.now() + SNOOZE_DURATION_MS);
    this.activeStatus = "idle";
    this.broadcast();
  }

  skipUpdate(version?: string): void {
    const target = version ?? this.pending?.version;
    if (!target) return;
    skipVersion(target);
    if (this.pending?.version === target) this.pending = null;
    this.activeStatus = "idle";
    this.error = undefined;
    this.broadcast();
  }

  private shouldShowModal(version: string): boolean {
    return !isUpdateBlocked(version);
  }

  private refreshAfterSnooze(): void {
    if (!this.pending?.version) return;
    if (!isVersionSnoozed(this.pending.version)) {
      this.activeStatus = this.pending.downloaded ? "ready" : this.activeStatus;
      this.broadcast();
    }
  }

  private buildState(): DesktopUpdateState {
    const currentVersion = app.getVersion();
    const version = this.pending?.version;
    let suppressed: DesktopUpdateState["suppressed"] = "none";
    let remindAfter: number | undefined;

    if (version) {
      if (isVersionSkipped(version)) suppressed = "skip";
      else if (isVersionSnoozed(version)) {
        suppressed = "snooze";
        remindAfter = getSnoozeUntil(version) ?? undefined;
      }
    }

    let status = this.activeStatus;
    if (this.pending && suppressed !== "skip") {
      if (suppressed === "snooze") status = "idle";
      else if (this.pending.downloaded) status = "ready";
      else if (this.pending.progress != null && this.pending.progress > 0) status = "downloading";
      else if (status === "idle") status = "available";
    }

    if (suppressed === "skip") status = "idle";

    return {
      status,
      currentVersion,
      version,
      releaseNotes: this.pending?.releaseNotes,
      progress: this.pending?.progress,
      error: this.error,
      downloaded: this.pending?.downloaded,
      suppressed,
      remindAfter,
    };
  }

  private broadcast(): void {
    const state = this.buildState();
    for (const win of this.getWindows()) {
      if (win.isDestroyed()) continue;
      win.webContents.send(UPDATE_IPC.stateChanged, state);
    }
  }
}

export const autoUpdateService = new AutoUpdateService();
