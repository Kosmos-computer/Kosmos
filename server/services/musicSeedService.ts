import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  MUSIC_SEED_TRACKS,
  type MusicSeedTrack,
} from "../../shared/musicSeed.js";

const DEFAULT_SEED_DIR = path.join(
  os.homedir(),
  "Music/Music/Media.localized/Music/tirufm/Unknown Album",
);

export interface MusicSeedTrackStatus extends MusicSeedTrack {
  available: boolean;
}

export function musicSeedDir(): string {
  return process.env.MUSIC_SEED_DIR
    ? path.resolve(process.env.MUSIC_SEED_DIR)
    : DEFAULT_SEED_DIR;
}

export function listSeedTracks(): MusicSeedTrackStatus[] {
  const dir = musicSeedDir();
  return MUSIC_SEED_TRACKS.map((track) => ({
    ...track,
    available: fs.existsSync(path.join(dir, track.fileName)),
  }));
}

export function resolveSeedTrack(trackId: string): { track: MusicSeedTrack; absPath: string } | null {
  const track = MUSIC_SEED_TRACKS.find((entry) => entry.id === trackId);
  if (!track) return null;

  const absPath = path.join(musicSeedDir(), track.fileName);
  if (!fs.existsSync(absPath)) return null;

  return { track, absPath };
}

export function statSeedTrack(trackId: string): { track: MusicSeedTrack; absPath: string; size: number } | null {
  const resolved = resolveSeedTrack(trackId);
  if (!resolved) return null;
  const size = fs.statSync(resolved.absPath).size;
  return { ...resolved, size };
}
