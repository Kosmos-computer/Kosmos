/**
 * User music library — imported local audio playable in the Music app.
 *
 * Seed tracks stay in musicSeedService; this service owns user imports under
 * data/music-library/ with a JSON manifest. Agents and the UI import from
 * torrent downloads, Drive blobs, allowed disk paths, or uploads.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  MusicArtTone,
  MusicImportInput,
  MusicScanInput,
  MusicTrackDto,
} from "../../shared/capabilities/music.js";
import { MUSIC_CHANGED_TOPIC } from "../../shared/capabilities/music.js";
import {
  MUSIC_SEED_ALBUM,
  MUSIC_SEED_ARTIST,
  type MusicSeedArtTone,
  type MusicSeedTrack,
} from "../../shared/musicSeed.js";
import { announceAppEvent } from "../bus.js";
import { dataDirs } from "../env.js";
import { filesService, MAX_AUDIO_BYTES } from "./filesService.js";
import { listSeedTracks, musicSeedDir, resolveSeedTrack, statSeedTrack } from "./musicSeedService.js";
// torrentService is loaded lazily in importFromTorrent to avoid pulling WebTorrent
// into every music list/stream path.

const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".aac", ".wav", ".ogg", ".flac"]);
const MAX_SCAN_DEPTH = 6;
const ART_TONES: MusicArtTone[] = [
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

interface LibraryRecord {
  id: string;
  title: string;
  fileName: string;
  storedName: string;
  artists: string;
  album: string;
  artTone: MusicArtTone;
  importedAt: string;
  sourceHash: string;
  originKind: "path" | "drive" | "torrent" | "upload" | "scan";
  originLabel?: string;
}

interface LibraryManifest {
  tracks: LibraryRecord[];
}

function libraryDir(): string {
  return path.join(dataDirs.root, "music-library");
}

function manifestPath(): string {
  return path.join(dataDirs.root, "music-library.json");
}

function loadManifest(): LibraryManifest {
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath(), "utf-8")) as Partial<LibraryManifest>;
    if (Array.isArray(parsed.tracks)) return { tracks: parsed.tracks };
  } catch {
    // Fresh library.
  }
  return { tracks: [] };
}

function saveManifest(manifest: LibraryManifest): void {
  fs.mkdirSync(dataDirs.root, { recursive: true });
  fs.writeFileSync(manifestPath(), JSON.stringify(manifest, null, 2), "utf-8");
}

function announceChange(): void {
  announceAppEvent(MUSIC_CHANGED_TOPIC, { appId: "system" });
}

function toneFor(key: string): MusicArtTone {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return ART_TONES[hash % ART_TONES.length];
}

function sanitizeFileName(value: string): string {
  return (
    value
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160) || "untitled.mp3"
  );
}

function titleFromFileName(fileName: string): string {
  const base = path.basename(fileName, path.extname(fileName));
  return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled";
}

function isAudioFile(fileName: string): boolean {
  return AUDIO_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function syncsafeInt(buffer: Buffer, offset: number): number {
  return (
    ((buffer[offset] & 0x7f) << 21) |
    ((buffer[offset + 1] & 0x7f) << 14) |
    ((buffer[offset + 2] & 0x7f) << 7) |
    (buffer[offset + 3] & 0x7f)
  );
}

function decodeId3Text(data: Buffer): string {
  if (data.length === 0) return "";
  const encoding = data[0];
  const payload = data.subarray(1);
  try {
    if (encoding === 1 || encoding === 2) {
      // UTF-16 with optional BOM
      let start = 0;
      let little = true;
      if (payload.length >= 2) {
        if (payload[0] === 0xff && payload[1] === 0xfe) {
          little = true;
          start = 2;
        } else if (payload[0] === 0xfe && payload[1] === 0xff) {
          little = false;
          start = 2;
        }
      }
      const chars: string[] = [];
      for (let i = start; i + 1 < payload.length; i += 2) {
        const code = little ? payload[i] | (payload[i + 1] << 8) : (payload[i] << 8) | payload[i + 1];
        if (code === 0) break;
        chars.push(String.fromCharCode(code));
      }
      return chars.join("").trim();
    }
    if (encoding === 3) return payload.toString("utf8").replace(/\0+$/, "").trim();
    return payload.toString("latin1").replace(/\0+$/, "").trim();
  } catch {
    return "";
  }
}

function readId3Tags(absPath: string): { title?: string; artists?: string; album?: string } {
  try {
    const fd = fs.openSync(absPath, "r");
    try {
      const header = Buffer.alloc(10);
      fs.readSync(fd, header, 0, 10, 0);
      if (header.toString("ascii", 0, 3) !== "ID3") return {};

      const versionMajor = header[3];
      const tagSize = syncsafeInt(header, 6);
      const tagBuffer = Buffer.alloc(Math.min(tagSize, 256 * 1024));
      fs.readSync(fd, tagBuffer, 0, tagBuffer.length, 10);

      const out: { title?: string; artists?: string; album?: string } = {};
      let offset = 0;
      while (offset + 10 <= tagBuffer.length) {
        const frameId = tagBuffer.toString("ascii", offset, offset + 4).replace(/\0/g, "");
        if (!frameId) break;
        const frameSize =
          versionMajor === 4
            ? syncsafeInt(tagBuffer, offset + 4)
            : tagBuffer.readUInt32BE(offset + 4);
        const frameStart = offset + 10;
        const frameEnd = frameStart + frameSize;
        if (frameEnd > tagBuffer.length) break;
        const text = decodeId3Text(tagBuffer.subarray(frameStart, frameEnd));
        if (frameId === "TIT2" && text) out.title = text;
        if (frameId === "TPE1" && text) out.artists = text;
        if (frameId === "TALB" && text) out.album = text;
        offset = frameEnd;
      }
      return out;
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return {};
  }
}

function hashFile(absPath: string): string {
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(absPath, "r");
  try {
    const buf = Buffer.alloc(64 * 1024);
    let bytesRead = 0;
    let position = 0;
    const size = fs.fstatSync(fd).size;
    // Hash head + size + tail for large files without reading everything.
    bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
    hash.update(buf.subarray(0, bytesRead));
    hash.update(String(size));
    if (size > buf.length) {
      const tailStart = Math.max(0, size - buf.length);
      bytesRead = fs.readSync(fd, buf, 0, buf.length, tailStart);
      hash.update(buf.subarray(0, bytesRead));
      position = tailStart;
    }
    void position;
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
}

function isPathInside(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  return resolved === resolvedRoot || resolved.startsWith(resolvedRoot + path.sep);
}

function assertAllowedSourcePath(absPath: string): string {
  const resolved = path.resolve(absPath);
  if (!fs.existsSync(resolved)) throw new Error("File not found");
  if (!fs.statSync(resolved).isFile()) throw new Error("Path is not a file");

  const allowedRoots = [dataDirs.torrents, musicSeedDir(), dataDirs.workspace, libraryDir()];
  if (!allowedRoots.some((root) => isPathInside(root, resolved))) {
    throw new Error("Path is outside allowed music import directories (torrents, seed, workspace)");
  }
  if (!isAudioFile(resolved)) throw new Error("File is not a supported audio format");
  const size = fs.statSync(resolved).size;
  if (size > MAX_AUDIO_BYTES) {
    throw new Error(`Audio exceeds the ${Math.round(MAX_AUDIO_BYTES / (1024 * 1024))} MB limit`);
  }
  return resolved;
}

function recordToDto(record: LibraryRecord): MusicTrackDto {
  const absPath = path.join(libraryDir(), record.storedName);
  return {
    id: record.id,
    title: record.title,
    fileName: record.fileName,
    artists: record.artists,
    album: record.album,
    artTone: record.artTone,
    available: fs.existsSync(absPath),
    origin: "library",
    importedAt: record.importedAt,
  };
}

function seedToDto(track: MusicSeedTrack & { available: boolean }): MusicTrackDto {
  return {
    id: track.id,
    title: track.title,
    fileName: track.fileName,
    artists: track.artists,
    album: track.album,
    artTone: track.artTone,
    available: track.available,
    origin: "seed",
  };
}

function findBySourceHash(manifest: LibraryManifest, sourceHash: string): LibraryRecord | undefined {
  return manifest.tracks.find((track) => track.sourceHash === sourceHash);
}

function importFromResolvedPath(
  absPath: string,
  options: {
    originKind: LibraryRecord["originKind"];
    originLabel?: string;
    title?: string;
    artists?: string;
    album?: string;
  },
): MusicTrackDto {
  const manifest = loadManifest();
  const sourceHash = hashFile(absPath);
  const existing = findBySourceHash(manifest, sourceHash);
  if (existing) {
    // Still announce so clients that missed the original import refresh.
    announceChange();
    return recordToDto(existing);
  }

  const tags = readId3Tags(absPath);
  const fileName = sanitizeFileName(path.basename(absPath));
  const id = `lib-${sourceHash.slice(0, 16)}`;
  const ext = path.extname(fileName).toLowerCase() || ".mp3";
  const storedName = `${id}${ext}`;

  fs.mkdirSync(libraryDir(), { recursive: true });
  fs.copyFileSync(absPath, path.join(libraryDir(), storedName));

  const record: LibraryRecord = {
    id,
    title: options.title?.trim() || tags.title || titleFromFileName(fileName),
    fileName,
    storedName,
    artists: options.artists?.trim() || tags.artists || MUSIC_SEED_ARTIST,
    album: options.album?.trim() || tags.album || MUSIC_SEED_ALBUM,
    artTone: toneFor(id),
    importedAt: new Date().toISOString(),
    sourceHash,
    originKind: options.originKind,
    originLabel: options.originLabel,
  };
  manifest.tracks.unshift(record);
  saveManifest(manifest);
  announceChange();
  return recordToDto(record);
}

function scanDirectory(root: string, depth = 0): string[] {
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
      files.push(...scanDirectory(abs, depth + 1));
      continue;
    }
    if (!entry.isFile()) continue;
    if (isAudioFile(entry.name)) files.push(abs);
  }
  return files;
}

export function listMusicTracks(): MusicTrackDto[] {
  const seeds = listSeedTracks().map(seedToDto);
  const library = loadManifest().tracks.map(recordToDto);
  // Library first so newly imported tracks show up at the top of "your library".
  return [...library, ...seeds];
}

export function getMusicTrack(id: string): MusicTrackDto | null {
  return listMusicTracks().find((track) => track.id === id) ?? null;
}

export function resolveLibraryTrack(
  trackId: string,
): { track: MusicSeedTrack; absPath: string } | null {
  const record = loadManifest().tracks.find((entry) => entry.id === trackId);
  if (!record) return null;
  const absPath = path.join(libraryDir(), record.storedName);
  if (!fs.existsSync(absPath)) return null;
  const track: MusicSeedTrack = {
    id: record.id,
    title: record.title,
    fileName: record.fileName,
    artists: record.artists,
    album: record.album,
    artTone: record.artTone as MusicSeedArtTone,
  };
  return { track, absPath };
}

export function resolveAnyMusicTrack(
  trackId: string,
): { track: MusicSeedTrack; absPath: string } | null {
  return resolveLibraryTrack(trackId) ?? resolveSeedTrack(trackId);
}

export function statAnyMusicTrack(
  trackId: string,
): { track: MusicSeedTrack; absPath: string; size: number } | null {
  const library = resolveLibraryTrack(trackId);
  if (library) {
    return { ...library, size: fs.statSync(library.absPath).size };
  }
  return statSeedTrack(trackId);
}

export async function importMusicTrack(
  input: MusicImportInput,
): Promise<MusicTrackDto | MusicTrackDto[]> {
  const hasPath = typeof input.path === "string" && input.path.trim().length > 0;
  const hasDrive = typeof input.driveFileId === "string" && input.driveFileId.trim().length > 0;
  const hasTorrent = typeof input.torrentId === "string" && input.torrentId.trim().length > 0;
  if (!hasPath && !hasDrive && !hasTorrent) {
    throw new Error("Provide path, driveFileId, or torrentId");
  }

  if (hasTorrent) {
    return importFromTorrent(String(input.torrentId), {
      fileName: input.fileName,
      title: input.title,
      artists: input.artists,
      album: input.album,
    });
  }

  if (hasDrive) {
    const { entry, data } = filesService.readBlob(String(input.driveFileId));
    if (!isAudioFile(entry.name) && !String(entry.mimeType).startsWith("audio/")) {
      throw new Error("Drive file is not audio");
    }
    if (data.length > MAX_AUDIO_BYTES) {
      throw new Error(`Audio exceeds the ${Math.round(MAX_AUDIO_BYTES / (1024 * 1024))} MB limit`);
    }
    fs.mkdirSync(libraryDir(), { recursive: true });
    const tmpPath = path.join(
      libraryDir(),
      `drive-${crypto.randomUUID()}${path.extname(entry.name) || ".mp3"}`,
    );
    fs.writeFileSync(tmpPath, data);
    try {
      return importFromResolvedPath(tmpPath, {
        originKind: "drive",
        originLabel: entry.name,
        title: input.title,
        artists: input.artists,
        album: input.album,
      });
    } finally {
      fs.rmSync(tmpPath, { force: true });
    }
  }

  const resolved = assertAllowedSourcePath(String(input.path));
  return importFromResolvedPath(resolved, {
    originKind: "path",
    originLabel: resolved,
    title: input.title,
    artists: input.artists,
    album: input.album,
  });
}

async function importFromTorrent(
  torrentId: string,
  options: { fileName?: string; title?: string; artists?: string; album?: string },
): Promise<MusicTrackDto[]> {
  const { torrentService } = await import("./torrentService.js");
  const torrent = await torrentService.get(torrentId);
  const wanted = options.fileName?.trim().toLowerCase();
  const audioFiles = torrent.files.filter((file) => {
    if (file.progress < 1 || !file.path) return false;
    if (!isAudioFile(file.name)) return false;
    if (!wanted) return true;
    const base = path.basename(file.name).toLowerCase();
    return base === wanted || file.name.toLowerCase().includes(wanted) || file.name.toLowerCase().endsWith(wanted);
  });
  if (audioFiles.length === 0) {
    throw new Error(
      wanted
        ? `No completed audio file matching "${options.fileName}" in torrent`
        : "No completed audio files in this torrent yet",
    );
  }

  const imported: MusicTrackDto[] = [];
  for (const file of audioFiles) {
    try {
      const track = importFromResolvedPath(file.path!, {
        originKind: "torrent",
        originLabel: `${torrent.name}/${file.name}`,
        title: audioFiles.length === 1 ? options.title : undefined,
        artists: options.artists,
        album: options.album ?? torrent.name,
      });
      imported.push(track);
    } catch (err) {
      console.warn(`[music] skip torrent file ${file.name}:`, err);
    }
  }
  if (imported.length === 0) throw new Error("No audio files could be imported from this torrent");
  return imported;
}

export function importMusicUpload(
  fileName: string,
  data: Buffer,
  meta?: { title?: string; artists?: string; album?: string },
): MusicTrackDto {
  if (!isAudioFile(fileName)) throw new Error("Uploaded file is not a supported audio format");
  if (data.length > MAX_AUDIO_BYTES) {
    throw new Error(`Audio exceeds the ${Math.round(MAX_AUDIO_BYTES / (1024 * 1024))} MB limit`);
  }
  fs.mkdirSync(libraryDir(), { recursive: true });
  const safeName = sanitizeFileName(fileName);
  const tmpPath = path.join(libraryDir(), `upload-${crypto.randomUUID()}${path.extname(safeName) || ".mp3"}`);
  fs.writeFileSync(tmpPath, data);
  try {
    return importFromResolvedPath(tmpPath, {
      originKind: "upload",
      originLabel: safeName,
      title: meta?.title,
      artists: meta?.artists,
      album: meta?.album,
    });
  } finally {
    if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath, { force: true });
  }
}

export async function scanMusicLibrary(input: MusicScanInput = {}): Promise<{
  imported: MusicTrackDto[];
  skipped: number;
  scanned: number;
}> {
  const source = input.source ?? "torrents";
  let root: string;
  if (source === "seed") {
    root = musicSeedDir();
  } else if (source === "path") {
    if (!input.path?.trim()) throw new Error("path is required when source=path");
    root = path.resolve(input.path);
    const allowed = [dataDirs.torrents, musicSeedDir(), dataDirs.workspace];
    if (!allowed.some((dir) => isPathInside(dir, root))) {
      throw new Error("Scan path is outside allowed directories");
    }
  } else {
    root = dataDirs.torrents;
  }

  if (!fs.existsSync(root)) {
    return { imported: [], skipped: 0, scanned: 0 };
  }

  const files = scanDirectory(root);
  const imported: MusicTrackDto[] = [];
  let skipped = 0;
  for (const file of files) {
    try {
      const before = loadManifest().tracks.length;
      const track = importFromResolvedPath(file, {
        originKind: "scan",
        originLabel: file,
      });
      const after = loadManifest().tracks.length;
      if (after > before) imported.push(track);
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }
  // Always notify the Music UI after a scan, even when everything was already imported.
  announceChange();
  return { imported, skipped, scanned: files.length };
}

export function removeMusicTrack(id: string): { ok: true } {
  const manifest = loadManifest();
  const index = manifest.tracks.findIndex((track) => track.id === id);
  if (index < 0) {
    if (listSeedTracks().some((track) => track.id === id)) {
      throw new Error("Seed tracks cannot be removed");
    }
    throw new Error("Track not found");
  }
  const [removed] = manifest.tracks.splice(index, 1);
  saveManifest(manifest);
  const absPath = path.join(libraryDir(), removed.storedName);
  fs.rmSync(absPath, { force: true });
  // Drop cached art if present.
  for (const ext of ["jpg", "png", "webp"]) {
    fs.rmSync(path.join(dataDirs.root, "music-art", `${id}.${ext}`), { force: true });
  }
  announceChange();
  return { ok: true };
}

/** Compatibility shim: MusicSeedTrackStatus[] shape for the existing Music UI. */
export function listMusicTracksAsSeedStatus(): Array<MusicSeedTrack & { available: boolean }> {
  return listMusicTracks().map((track) => ({
    id: track.id,
    title: track.title,
    fileName: track.fileName,
    artists: track.artists,
    album: track.album,
    artTone: track.artTone as MusicSeedArtTone,
    available: track.available,
  }));
}
