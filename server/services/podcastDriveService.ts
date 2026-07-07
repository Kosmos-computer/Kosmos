import fs from "node:fs";
import path from "node:path";
import type { FileEntry } from "../../shared/capabilities/files.js";
import { FOLDER_MIME } from "../../shared/capabilities/files.js";
import { PODCASTS_FOLDER_NAME } from "../seeds/driveSeedData.js";
import { dataDirs } from "../env.js";
import { filesService, MAX_AUDIO_BYTES } from "./filesService.js";
import { resolveLocalEpisode } from "./podcastSeedService.js";
import { resolveRssEpisode, type RssEpisodeRecord } from "./podcastRssService.js";

const MANIFEST_FILE = path.join(dataDirs.root, "podcast-drive-saves.json");

interface DriveSaveRecord {
  episodeId: string;
  driveFileId: string;
  fileName: string;
  savedAt: string;
}

interface DriveSaveManifest {
  records: DriveSaveRecord[];
}

function loadManifest(): DriveSaveManifest {
  try {
    const parsed = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf-8")) as Partial<DriveSaveManifest>;
    if (parsed.records) return { records: parsed.records };
  } catch {
    // Fresh manifest.
  }
  return { records: [] };
}

function saveManifest(manifest: DriveSaveManifest): void {
  fs.mkdirSync(dataDirs.root, { recursive: true });
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf-8");
}

function sanitizeName(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "untitled";
}

function extensionFromUrl(url: string): string {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    if ([".mp3", ".m4a", ".aac", ".wav", ".ogg"].includes(ext)) return ext;
  } catch {
    // Fall through.
  }
  return ".mp3";
}

function mimeFromExtension(ext: string): string {
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".ogg") return "audio/ogg";
  if (ext === ".aac") return "audio/aac";
  return "audio/mpeg";
}

function ensureFolder(name: string, parentId: string | null): FileEntry {
  const existing = filesService
    .list({ parentId })
    .find((entry) => entry.mimeType === FOLDER_MIME && entry.name === name);
  if (existing) return existing;
  return filesService.create({ name, parentId, kind: "folder" });
}

function ensurePodcastsPath(showTitle: string): string {
  const root = ensureFolder(PODCASTS_FOLDER_NAME, null);
  const showFolder = ensureFolder(sanitizeName(showTitle), root.id);
  return showFolder.id;
}

function findExistingFile(name: string, parentId: string): FileEntry | undefined {
  return filesService.list({ parentId }).find((entry) => entry.name === name && entry.mimeType !== FOLDER_MIME);
}

async function fetchRssAudio(episode: RssEpisodeRecord): Promise<{ data: Buffer; ext: string; mimeType: string }> {
  const response = await fetch(episode.enclosureUrl, {
    headers: {
      Accept: "audio/*,*/*",
      "User-Agent": "Arco-Podcasts/1.0",
    },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const data = Buffer.from(await response.arrayBuffer());
  const ext = extensionFromUrl(episode.enclosureUrl);
  return { data, ext, mimeType: mimeFromExtension(ext) };
}

function readLocalAudio(episodeId: string): { data: Buffer; ext: string; mimeType: string; title: string; showTitle: string } {
  const resolved = resolveLocalEpisode(episodeId);
  if (!resolved) throw new Error("Episode not found");
  const data = fs.readFileSync(resolved.absPath);
  const ext = path.extname(resolved.absPath).toLowerCase() || ".mp3";
  return {
    data,
    ext,
    mimeType: resolved.mimeType,
    title: resolved.episode.title,
    showTitle: resolved.episode.showTitle,
  };
}

export function listPodcastDriveSaves(): DriveSaveRecord[] {
  return loadManifest().records;
}

export function getPodcastDriveSave(episodeId: string): DriveSaveRecord | undefined {
  return loadManifest().records.find((record) => record.episodeId === episodeId);
}

export async function savePodcastEpisodeToDrive(episodeId: string): Promise<FileEntry> {
  const manifest = loadManifest();
  const existing = manifest.records.find((record) => record.episodeId === episodeId);
  if (existing) {
    try {
      return filesService.get(existing.driveFileId);
    } catch {
      manifest.records = manifest.records.filter((record) => record.episodeId !== episodeId);
      saveManifest(manifest);
    }
  }

  let title: string;
  let showTitle: string;
  let data: Buffer;
  let ext: string;
  let mimeType: string;

  if (episodeId.startsWith("rss-")) {
    let episode = resolveRssEpisode(episodeId);
    if (!episode) {
      const { listRssEpisodes } = await import("./podcastRssService.js");
      await listRssEpisodes();
      episode = resolveRssEpisode(episodeId);
    }
    if (!episode) throw new Error("Episode not found");
    title = episode.title;
    showTitle = episode.showTitle;
    const fetched = await fetchRssAudio(episode);
    data = fetched.data;
    ext = fetched.ext;
    mimeType = fetched.mimeType;
  } else {
    const local = readLocalAudio(episodeId);
    title = local.title;
    showTitle = local.showTitle;
    data = local.data;
    ext = local.ext;
    mimeType = local.mimeType;
  }

  if (data.length > MAX_AUDIO_BYTES) {
    throw new Error(`Episode exceeds the ${Math.round(MAX_AUDIO_BYTES / (1024 * 1024))} MB Drive limit`);
  }

  const parentId = ensurePodcastsPath(showTitle);
  const baseName = sanitizeName(title);
  let fileName = `${baseName}${ext}`;
  const duplicate = findExistingFile(fileName, parentId);
  if (duplicate) {
    manifest.records.push({
      episodeId,
      driveFileId: duplicate.id,
      fileName: duplicate.name,
      savedAt: new Date().toISOString(),
    });
    saveManifest(manifest);
    return duplicate;
  }

  if (manifest.records.some((record) => record.fileName === fileName && record.episodeId !== episodeId)) {
    fileName = `${baseName} (${episodeId.slice(0, 8)})${ext}`;
  }

  const entry = filesService.create(
    {
      name: fileName,
      parentId,
      kind: "file",
      mimeType,
      contentBase64: data.toString("base64"),
    },
    { maxBytes: MAX_AUDIO_BYTES },
  );

  manifest.records.push({
    episodeId,
    driveFileId: entry.id,
    fileName: entry.name,
    savedAt: new Date().toISOString(),
  });
  saveManifest(manifest);
  return entry;
}
