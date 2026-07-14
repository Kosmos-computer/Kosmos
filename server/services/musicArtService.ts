import fs from "node:fs";
import path from "node:path";
import { dataDirs } from "../env.js";
import { resolveAnyMusicTrack } from "./musicLibraryService.js";

const ART_CACHE_DIR = path.join(dataDirs.root, "music-art");

function syncsafeInt(buffer: Buffer, offset: number): number {
  return (
    ((buffer[offset] & 0x7f) << 21) |
    ((buffer[offset + 1] & 0x7f) << 14) |
    ((buffer[offset + 2] & 0x7f) << 7) |
    (buffer[offset + 3] & 0x7f)
  );
}

function skipEncodedText(data: Buffer, offset: number, encoding: number): number {
  if (encoding === 1 || encoding === 2) {
    let index = offset;
    while (index < data.length - 1) {
      if (data[index] === 0 && data[index + 1] === 0) return index + 2;
      index += 2;
    }
    return data.length;
  }

  let index = offset;
  while (index < data.length && data[index] !== 0) index += 1;
  return index + 1;
}

function parseApicFrame(data: Buffer): { mime: string; image: Buffer } | null {
  if (data.length < 4) return null;

  const encoding = data[0];
  let offset = 1;

  let mimeEnd = offset;
  while (mimeEnd < data.length && data[mimeEnd] !== 0) mimeEnd += 1;
  const mime = data.toString("latin1", offset, mimeEnd).toLowerCase();
  offset = mimeEnd + 1;
  if (offset >= data.length) return null;

  offset += 1; // picture type
  offset = skipEncodedText(data, offset, encoding);
  if (offset >= data.length) return null;

  const image = data.subarray(offset);
  if (image.length === 0) return null;

  return { mime, image };
}

function extractEmbeddedArt(mp3Path: string): { mime: string; image: Buffer } | null {
  const fd = fs.openSync(mp3Path, "r");
  try {
    const header = Buffer.alloc(10);
    fs.readSync(fd, header, 0, 10, 0);
    if (header.toString("ascii", 0, 3) !== "ID3") return null;

    const versionMajor = header[3];
    const tagSize = syncsafeInt(header, 6);
    const tagBuffer = Buffer.alloc(tagSize);
    fs.readSync(fd, tagBuffer, 0, tagSize, 10);

    let offset = 0;
    while (offset + 10 <= tagSize) {
      const frameId = tagBuffer.toString("ascii", offset, offset + 4).replace(/\0/g, "");
      if (!frameId) break;

      const frameSize =
        versionMajor === 4
          ? syncsafeInt(tagBuffer, offset + 4)
          : tagBuffer.readUInt32BE(offset + 4);
      const frameStart = offset + 10;
      const frameEnd = frameStart + frameSize;
      if (frameEnd > tagSize) break;

      if (frameId === "APIC") {
        const parsed = parseApicFrame(tagBuffer.subarray(frameStart, frameEnd));
        if (parsed) return parsed;
      }

      offset = frameEnd;
    }
  } finally {
    fs.closeSync(fd);
  }

  return null;
}

function mimeToExt(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

function contentTypeForExt(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

function findCachedArt(trackId: string): { mime: string; absPath: string } | null {
  for (const ext of ["jpg", "png", "webp"] as const) {
    const absPath = path.join(ART_CACHE_DIR, `${trackId}.${ext}`);
    if (fs.existsSync(absPath)) {
      return { mime: contentTypeForExt(ext), absPath };
    }
  }
  return null;
}

export function resolveTrackArt(trackId: string): { mime: string; absPath: string } | null {
  const cached = findCachedArt(trackId);
  if (cached) return cached;

  const resolved = resolveAnyMusicTrack(trackId);
  if (!resolved) return null;

  const extracted = extractEmbeddedArt(resolved.absPath);
  if (!extracted) return null;

  fs.mkdirSync(ART_CACHE_DIR, { recursive: true });
  const ext = mimeToExt(extracted.mime);
  const outPath = path.join(ART_CACHE_DIR, `${trackId}.${ext}`);
  fs.writeFileSync(outPath, extracted.image);

  return {
    mime: extracted.mime || contentTypeForExt(ext),
    absPath: outPath,
  };
}
