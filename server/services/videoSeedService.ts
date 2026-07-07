import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".webm", ".m4v", ".mkv"]);
const MAX_VIDEOS = 48;
const MAX_SCAN_DEPTH = 5;

export type VideoArtTone =
  | "rose"
  | "orange"
  | "amber"
  | "lime"
  | "green"
  | "teal"
  | "cyan"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "pink";

export interface LocalVideoEntry {
  id: string;
  title: string;
  fileName: string;
  channel: string;
  durationLabel: string;
  artTone: VideoArtTone;
  mimeType: string;
  source: "local";
}

export interface LocalVideoStatus extends LocalVideoEntry {
  available: boolean;
}

const ART_TONES: VideoArtTone[] = [
  "rose",
  "orange",
  "amber",
  "lime",
  "green",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "purple",
  "pink",
];

function defaultVideoDir(): string {
  return path.join(os.homedir(), "Movies");
}

export function videoSeedDir(): string {
  return process.env.VIDEO_SEED_DIR ? path.resolve(process.env.VIDEO_SEED_DIR) : defaultVideoDir();
}

function slugId(absPath: string): string {
  return crypto.createHash("sha256").update(absPath).digest("hex").slice(0, 16);
}

function titleFromFileName(fileName: string): string {
  const base = path.basename(fileName, path.extname(fileName));
  return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function mimeForExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".mp4":
    case ".m4v":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".mkv":
      return "video/x-matroska";
    default:
      return "application/octet-stream";
  }
}

function channelFromPath(absPath: string, root: string): string {
  const rel = path.relative(root, absPath);
  const parts = rel.split(path.sep);
  if (parts.length > 1) return parts[parts.length - 2];
  return "Local videos";
}

function scanVideos(root: string, depth = 0): string[] {
  if (depth > MAX_SCAN_DEPTH) return [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const abs = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanVideos(abs, depth + 1));
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (VIDEO_EXTENSIONS.has(ext)) files.push(abs);
  }
  return files;
}

let cachedVideos: LocalVideoEntry[] | null = null;

function buildCatalog(): LocalVideoEntry[] {
  if (cachedVideos) return cachedVideos;

  const root = videoSeedDir();
  const paths = scanVideos(root)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, MAX_VIDEOS);

  cachedVideos = paths.map((absPath, index) => {
    const fileName = path.basename(absPath);
    const ext = path.extname(fileName);
    return {
      id: slugId(absPath),
      title: titleFromFileName(fileName),
      fileName,
      channel: channelFromPath(absPath, root),
      durationLabel: "—",
      artTone: ART_TONES[index % ART_TONES.length],
      mimeType: mimeForExt(ext),
      source: "local" as const,
    };
  });

  return cachedVideos;
}

const pathById = new Map<string, string>();

function indexPaths(): void {
  pathById.clear();
  const root = videoSeedDir();
  for (const absPath of scanVideos(root)) {
    pathById.set(slugId(absPath), absPath);
  }
}

export function listLocalVideos(): LocalVideoStatus[] {
  indexPaths();
  return buildCatalog().map((video) => ({
    ...video,
    available: pathById.has(video.id),
  }));
}

export function resolveLocalVideo(videoId: string): { video: LocalVideoEntry; absPath: string } | null {
  indexPaths();
  const absPath = pathById.get(videoId);
  if (!absPath || !fs.existsSync(absPath)) return null;
  const video = buildCatalog().find((entry) => entry.id === videoId);
  if (!video) return null;
  return { video, absPath };
}

export function statLocalVideo(videoId: string): { video: LocalVideoEntry; absPath: string; size: number } | null {
  const resolved = resolveLocalVideo(videoId);
  if (!resolved) return null;
  const size = fs.statSync(resolved.absPath).size;
  return { ...resolved, size };
}

export function invalidateVideoCache(): void {
  cachedVideos = null;
  pathById.clear();
}
