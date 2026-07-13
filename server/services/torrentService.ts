/**
 * System torrent service — default provider for os.downloads@1.
 *
 * Uses WebTorrent in-process (same pattern as other OS services: no external
 * Transmission/qBittorrent binary). Torrents download under data/torrents/;
 * completed files under the Drive import size cap are copied into Drive.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import WebTorrent from "webtorrent";
import type {
  DownloadsStatsDto,
  TorrentAddInput,
  TorrentDto,
  TorrentFileDto,
  TorrentPeerDto,
  TorrentStatus,
  TorrentTrackerDto,
} from "../../shared/capabilities/downloads.js";
import { DOWNLOADS_CHANGED_TOPIC } from "../../shared/capabilities/downloads.js";
import { FOLDER_MIME } from "../../shared/capabilities/files.js";
import { announceAppEvent } from "../bus.js";
import { dataDirs } from "../env.js";
import { filesService, MAX_AUDIO_BYTES } from "./filesService.js";

/** Auto-import completed files into Drive when at or under this size. */
const DRIVE_IMPORT_MAX_BYTES = MAX_AUDIO_BYTES;
const DOWNLOADS_FOLDER_NAME = "Downloads";
const CLIENT_VERSION = "WebTorrent (Kosmos)";

interface PersistedTorrent {
  source: string;
  addedAt: string;
  paused?: boolean;
  driveFileIds?: string[];
}

interface MetaRecord {
  addedAt: string;
  source: string;
  driveFileIds: string[];
  /** User-stopped (distinct from paused — resume stays stopped until explicit resume). */
  stopped?: boolean;
  error?: string | null;
}

type WtTorrent = WebTorrent.Torrent;
type WtClient = WebTorrent.Instance;

let client: WtClient | null = null;
const metaById = new Map<string, MetaRecord>();
let bootPromise: Promise<void> | null = null;

function announceChange(): void {
  announceAppEvent(DOWNLOADS_CHANGED_TOPIC, { appId: "system" });
}

function stateFile(): string {
  return path.join(dataDirs.root, "downloads-torrents.json");
}

function loadPersisted(): PersistedTorrent[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFile(), "utf-8")) as {
      torrents?: PersistedTorrent[];
    };
    return Array.isArray(parsed.torrents) ? parsed.torrents : [];
  } catch {
    return [];
  }
}

function savePersisted(): void {
  const torrents: PersistedTorrent[] = [];
  for (const t of getClient().torrents) {
    const meta = metaById.get(t.infoHash);
    if (!meta?.source) continue;
    torrents.push({
      source: meta.source,
      addedAt: meta.addedAt,
      paused: Boolean(t.paused || meta.stopped),
      driveFileIds: meta.driveFileIds,
    });
  }
  fs.mkdirSync(dataDirs.root, { recursive: true });
  fs.writeFileSync(stateFile(), JSON.stringify({ torrents }, null, 2), "utf-8");
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = n;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  const digits = i === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[i]}`;
}

function formatSpeed(n: number): string {
  return `${formatBytes(n)}/s`;
}

function relativeTime(msAgo: number): string {
  if (!Number.isFinite(msAgo) || msAgo < 0) return "—";
  if (msAgo < 5_000) return "now";
  if (msAgo < 60_000) return `${Math.round(msAgo / 1000)}s ago`;
  if (msAgo < 3_600_000) return `${Math.round(msAgo / 60_000)} min ago`;
  if (msAgo < 86_400_000) return `${Math.round(msAgo / 3_600_000)}h ago`;
  return `${Math.round(msAgo / 86_400_000)}d ago`;
}

function mimeFromName(name: string): string {
  const ext = path.extname(name).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".mkv": "video/x-matroska",
    ".webm": "video/webm",
    ".zip": "application/zip",
    ".gz": "application/gzip",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".json": "application/json",
    ".html": "text/html",
    ".iso": "application/x-iso9660-image",
  };
  return map[ext] ?? "application/octet-stream";
}

function ensureDownloadsFolder(): string {
  const existing = filesService
    .list({ parentId: null })
    .find((entry) => entry.mimeType === FOLDER_MIME && entry.name === DOWNLOADS_FOLDER_NAME);
  if (existing) return existing.id;
  return filesService.create({ name: DOWNLOADS_FOLDER_NAME, parentId: null, kind: "folder" }).id;
}

function getClient(): WtClient {
  if (!client) {
    fs.mkdirSync(dataDirs.torrents, { recursive: true });
    client = new WebTorrent();
    client.on("error", (err: Error | string) => {
      console.warn("[downloads] client error:", err);
    });
  }
  return client;
}

function requireTorrent(id: string): WtTorrent {
  const torrent = getClient().get(id);
  if (!torrent) throw new Error(`Torrent not found: ${id}`);
  return torrent as WtTorrent;
}

function statusFor(torrent: WtTorrent, meta: MetaRecord | undefined): TorrentStatus {
  if (meta?.error) return "error";
  if (meta?.stopped) return "stopped";
  if (torrent.paused) return "paused";
  if (!torrent.ready) return "checking";
  if (torrent.done) return "seeding";
  if (torrent.downloadSpeed > 0 || torrent.progress > 0) return "downloading";
  return "queued";
}

function mapTrackers(torrent: WtTorrent): TorrentTrackerDto[] {
  const announce = (torrent.announce ?? []) as string[];
  if (announce.length === 0) {
    return [
      {
        id: "tr-default",
        url: "dht://",
        status: "working",
        lastAnnounce: "—",
        seeders: 0,
        leechers: torrent.numPeers,
      },
    ];
  }
  return announce.map((url, index) => ({
    id: `tr-${index}`,
    url,
    status: "working" as const,
    lastAnnounce: relativeTime(0),
    seeders: 0,
    leechers: torrent.numPeers,
  }));
}

function mapPeers(torrent: WtTorrent): TorrentPeerDto[] {
  const wires = (
    (torrent as WtTorrent & { wires?: Array<{
      remoteAddress?: string;
      remotePort?: number;
      peerId?: Buffer | string;
      remoteType?: string;
      downloaded?: number;
      uploaded?: number;
      downloadSpeed?: number;
      uploadSpeed?: number;
      type?: string;
    }> }).wires ?? []
  );
  return wires.slice(0, 40).map((wire, index) => {
    const address =
      wire.remoteAddress && wire.remotePort
        ? `${wire.remoteAddress}:${wire.remotePort}`
        : wire.remoteAddress ?? `peer-${index}`;
    return {
      id: `p-${index}-${address}`,
      address,
      client: wire.type || wire.remoteType || "BitTorrent",
      progress: torrent.progress,
      downSpeed: formatSpeed(wire.downloadSpeed ?? 0),
      upSpeed: formatSpeed(wire.uploadSpeed ?? 0),
      flags: torrent.done ? "S" : "D",
    };
  });
}

function mapFiles(torrent: WtTorrent): TorrentFileDto[] {
  const files = torrent.files ?? [];
  return files.map((file, index) => {
    const abs =
      typeof (file as { path?: string }).path === "string"
        ? path.isAbsolute((file as { path: string }).path)
          ? (file as { path: string }).path
          : path.join(torrent.path, (file as { path: string }).path)
        : path.join(torrent.path, file.name);
    const progress =
      file.length > 0 ? Math.min(1, (file.downloaded ?? 0) / file.length) : torrent.progress;
    return {
      id: `${torrent.infoHash}-f${index}`,
      name: file.path || file.name,
      size: formatBytes(file.length),
      sizeBytes: file.length,
      progress,
      priority: "normal",
      wanted: true,
      path: abs,
    };
  });
}

function toDto(torrent: WtTorrent): TorrentDto {
  const meta = metaById.get(torrent.infoHash) ?? {
    addedAt: new Date().toISOString(),
    source: torrent.magnetURI ?? torrent.infoHash,
    driveFileIds: [],
  };
  const status = statusFor(torrent, meta);
  const remainingBytes = Math.max(0, torrent.length - torrent.downloaded);
  const trackers = mapTrackers(torrent);
  const peersList = mapPeers(torrent);
  const idle =
    status === "paused" || status === "stopped" || status === "error" || status === "queued";

  return {
    id: torrent.infoHash,
    name: torrent.name || torrent.infoHash,
    size: formatBytes(torrent.length),
    sizeBytes: torrent.length,
    progress: torrent.progress,
    status,
    seeds: { connected: torrent.numPeers, total: torrent.numPeers },
    peers: { connected: torrent.numPeers, total: torrent.numPeers },
    downSpeed: idle ? "0 B/s" : formatSpeed(torrent.downloadSpeed),
    upSpeed: idle ? "0 B/s" : formatSpeed(torrent.uploadSpeed),
    ratio: torrent.downloaded > 0 ? torrent.uploaded / torrent.downloaded : 0,
    uploaded: formatBytes(torrent.uploaded),
    downloaded: formatBytes(torrent.downloaded),
    remaining: formatBytes(remainingBytes),
    wasted: "0 B",
    tracker: trackers[0]?.url ?? "—",
    trackerUpdate: trackers[0]?.lastAnnounce ?? "—",
    lastActive: idle ? "—" : "now",
    maxPeers: 50,
    downLimit: "Unlimited",
    upLimit: "Unlimited",
    error: meta.error ?? null,
    addedAt: meta.addedAt,
    savePath: torrent.path,
    magnetUri: torrent.magnetURI,
    driveFileIds: meta.driveFileIds,
    trackers,
    peersList,
    files: mapFiles(torrent),
  };
}

function importIntoDrive(torrent: WtTorrent): string[] {
  const meta = metaById.get(torrent.infoHash);
  if (!meta) return [];
  if (meta.driveFileIds.length > 0) return meta.driveFileIds;

  const parentId = ensureDownloadsFolder();
  const imported: string[] = [];
  const torrentFolder = filesService.create({
    name: torrent.name || torrent.infoHash,
    parentId,
    kind: "folder",
  });

  for (const file of mapFiles(torrent)) {
    if (!file.path || !fs.existsSync(file.path)) continue;
    if (file.sizeBytes > DRIVE_IMPORT_MAX_BYTES) continue;
    try {
      const baseName = path.basename(file.name);
      const entry = filesService.createFromPath(
        {
          name: baseName,
          parentId: torrentFolder.id,
          mimeType: mimeFromName(baseName),
          sourcePath: file.path,
        },
        { maxBytes: DRIVE_IMPORT_MAX_BYTES },
      );
      imported.push(entry.id);
    } catch (err) {
      console.warn(`[downloads] Drive import skipped for ${file.name}:`, err);
    }
  }

  meta.driveFileIds = imported;
  savePersisted();
  return imported;
}

function attachTorrent(torrent: WtTorrent, meta: MetaRecord): void {
  metaById.set(torrent.infoHash, meta);

  torrent.on("ready", () => {
    announceChange();
    savePersisted();
  });
  torrent.on("download", () => {
    // Throttled via polling on the client; avoid flooding the bus.
  });
  torrent.on("done", () => {
    try {
      importIntoDrive(torrent);
    } catch (err) {
      console.warn("[downloads] Drive import failed:", err);
    }
    announceChange();
    savePersisted();
  });
  torrent.on("error", (err: Error | string) => {
    const record = metaById.get(torrent.infoHash);
    if (record) record.error = typeof err === "string" ? err : err.message;
    announceChange();
  });
  torrent.on("warning", (err: Error | string) => {
    console.warn("[downloads] torrent warning:", err);
  });
}

async function addSourceInner(
  source: string,
  options?: { paused?: boolean; addedAt?: string; driveFileIds?: string[]; persist?: boolean },
): Promise<TorrentDto> {
  const trimmed = source.trim();
  if (!trimmed) throw new Error("source is required");
  if (!trimmed.startsWith("magnet:") && !/^https?:\/\//i.test(trimmed)) {
    throw new Error("source must be a magnet URI or http(s) .torrent URL");
  }

  const existing = getClient().torrents.find((t) => {
    const m = metaById.get(t.infoHash);
    return m?.source === trimmed || t.magnetURI === trimmed;
  });
  if (existing) return toDto(existing);

  const addedAt = options?.addedAt ?? new Date().toISOString();
  const meta: MetaRecord = {
    addedAt,
    source: trimmed,
    driveFileIds: options?.driveFileIds ?? [],
    stopped: false,
    error: null,
  };

  const torrent = await new Promise<WtTorrent>((resolve, reject) => {
    try {
      const t = getClient().add(trimmed, { path: dataDirs.torrents }, (ready) => {
        resolve(ready as WtTorrent);
      });
      t.on("error", (err: Error | string) => {
        reject(typeof err === "string" ? new Error(err) : err);
      });
    } catch (err) {
      reject(err);
    }
  });

  attachTorrent(torrent, meta);
  if (options?.paused) {
    torrent.pause();
    meta.stopped = false;
  }
  if (options?.persist !== false) {
    savePersisted();
    announceChange();
  }
  return toDto(torrent);
}

async function ensureBooted(): Promise<void> {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    fs.mkdirSync(dataDirs.torrents, { recursive: true });
    getClient();
    const persisted = loadPersisted();
    for (const entry of persisted) {
      try {
        await addSourceInner(entry.source, {
          paused: entry.paused,
          addedAt: entry.addedAt,
          driveFileIds: entry.driveFileIds,
          persist: false,
        });
      } catch (err) {
        console.warn("[downloads] failed to restore torrent:", entry.source, err);
      }
    }
  })();
  return bootPromise;
}

function freeSpaceLabel(): string {
  try {
    // Node 18.15+ — fall back quietly on older runtimes.
    const statFs = (fs as typeof fs & { statfsSync?: (p: string) => { bavail: number; bsize: number } })
      .statfsSync;
    if (typeof statFs === "function") {
      const s = statFs(dataDirs.torrents);
      return formatBytes(s.bavail * s.bsize);
    }
  } catch {
    // ignore
  }
  return "—";
}

export const torrentService = {
  async ensureReady(): Promise<void> {
    await ensureBooted();
  },

  async list(): Promise<TorrentDto[]> {
    await ensureBooted();
    return getClient().torrents.map((t) => toDto(t as WtTorrent));
  },

  async get(id: string): Promise<TorrentDto> {
    await ensureBooted();
    return toDto(requireTorrent(id));
  },

  async stats(): Promise<DownloadsStatsDto> {
    await ensureBooted();
    const torrents = getClient().torrents as WtTorrent[];
    let down = 0;
    let up = 0;
    let total = 0;
    for (const t of torrents) {
      const meta = metaById.get(t.infoHash);
      if (!meta?.stopped && !t.paused) {
        down += t.downloadSpeed;
        up += t.uploadSpeed;
      }
      total += t.length;
    }
    return {
      clientVersion: CLIENT_VERSION,
      host: os.hostname(),
      globalDownSpeed: formatSpeed(down),
      globalUpSpeed: formatSpeed(up),
      freeSpace: freeSpaceLabel(),
      totalSize: formatBytes(total),
      torrentCount: torrents.length,
    };
  },

  async add(input: TorrentAddInput): Promise<TorrentDto> {
    await ensureBooted();
    return addSourceInner(input.source, { paused: input.paused });
  },

  async pause(id: string): Promise<TorrentDto> {
    await ensureBooted();
    const torrent = requireTorrent(id);
    const meta = metaById.get(id);
    if (meta) {
      meta.stopped = false;
      meta.error = null;
    }
    torrent.pause();
    savePersisted();
    announceChange();
    return toDto(torrent);
  },

  async resume(id: string): Promise<TorrentDto> {
    await ensureBooted();
    const torrent = requireTorrent(id);
    const meta = metaById.get(id);
    if (meta) {
      meta.stopped = false;
      meta.error = null;
    }
    torrent.resume();
    savePersisted();
    announceChange();
    return toDto(torrent);
  },

  async stop(id: string): Promise<TorrentDto> {
    await ensureBooted();
    const torrent = requireTorrent(id);
    const meta = metaById.get(id);
    if (meta) meta.stopped = true;
    torrent.pause();
    savePersisted();
    announceChange();
    return toDto(torrent);
  },

  async remove(id: string, deleteFiles = false): Promise<{ ok: true }> {
    await ensureBooted();
    const torrent = requireTorrent(id);
    await new Promise<void>((resolve, reject) => {
      torrent.destroy({ destroyStore: deleteFiles }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    metaById.delete(id);
    savePersisted();
    announceChange();
    return { ok: true };
  },
};

/** Resolve package path so tests can import without side effects. */
export function torrentsDir(): string {
  return dataDirs.torrents;
}
