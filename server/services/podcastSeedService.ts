import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveSeedTrack } from "./musicSeedService.js";

export type PodcastArtTone =
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

export type PodcastContentKind = "podcast" | "audiobook";

export interface PodcastEpisodeSeed {
  id: string;
  title: string;
  showTitle: string;
  host: string;
  fileName: string;
  kind: PodcastContentKind;
  artTone: PodcastArtTone;
  durationLabel: string;
  /** When set, episode is resolved from music seed MP3s. */
  musicTrackId?: string;
}

export interface PodcastEpisodeStatus extends PodcastEpisodeSeed {
  available: boolean;
  source: "local";
}

/** Curated long-form episodes — tirufm tracks as meditation podcast + audiobook samples. */
export const PODCAST_EPISODE_SEEDS: PodcastEpisodeSeed[] = [
  {
    id: "ep-bhaja-govindam",
    title: "Bhaja Govindam — Song of Awakening",
    showTitle: "Tiru.fm Dharma Talks",
    host: "tirufm",
    fileName: "Bhaja Govindam — Song of Awakening.mp3",
    kind: "podcast",
    artTone: "cyan",
    durationLabel: "12:04",
    musicTrackId: "bhaja-govindam",
  },
  {
    id: "ep-self-shining",
    title: "The Self Shining",
    showTitle: "Tiru.fm Dharma Talks",
    host: "tirufm",
    fileName: "The Self Shining.mp3",
    kind: "podcast",
    artTone: "purple",
    durationLabel: "8:42",
    musicTrackId: "self-shining",
  },
  {
    id: "ep-jaago-abhi",
    title: "जागो अभी (Jaago Abhi) — Wake Up Now",
    showTitle: "Tiru.fm Dharma Talks",
    host: "tirufm",
    fileName: "जागो अभी (Jaago Abhi)  Wake Up Now.mp3",
    kind: "podcast",
    artTone: "pink",
    durationLabel: "6:18",
    musicTrackId: "jaago-abhi",
  },
  {
    id: "ep-turiya",
    title: "III. TURIYA",
    showTitle: "Yoga Sūtra Readings",
    host: "tirufm",
    fileName: "III. TURIYA.mp3",
    kind: "audiobook",
    artTone: "blue",
    durationLabel: "14:22",
    musicTrackId: "turiya",
  },
  {
    id: "ep-vismayo",
    title: "V. VISMAYO YOGABHŪMIKĀḤ",
    showTitle: "Yoga Sūtra Readings",
    host: "tirufm",
    fileName: "V. VISMAYO YOGABHŪMIKĀḤ.mp3",
    kind: "audiobook",
    artTone: "violet",
    durationLabel: "11:05",
    musicTrackId: "vismayo",
  },
  {
    id: "ep-om-namah",
    title: "Om Namah Shivaya ॐ नमः शिवाय I",
    showTitle: "Mantra Hour",
    host: "tirufm",
    fileName: "Om Namah Shivaya ॐ नमः शिवाय I.mp3",
    kind: "audiobook",
    artTone: "indigo",
    durationLabel: "9:33",
    musicTrackId: "om-namah-shivaya",
  },
];

const PODCAST_EXTENSIONS = new Set([".mp3", ".m4a", ".aac", ".wav", ".ogg"]);
const MAX_SCAN = 32;
const MAX_SCAN_DEPTH = 4;

function defaultPodcastDir(): string {
  return path.join(os.homedir(), "Music", "Podcasts");
}

export function podcastSeedDir(): string {
  return process.env.PODCAST_SEED_DIR ? path.resolve(process.env.PODCAST_SEED_DIR) : defaultPodcastDir();
}

function scanAudio(root: string, depth = 0): string[] {
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
      files.push(...scanAudio(abs, depth + 1));
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (PODCAST_EXTENSIONS.has(ext)) files.push(abs);
  }
  return files;
}

const scannedById = new Map<string, string>();

function indexScanned(): PodcastEpisodeSeed[] {
  scannedById.clear();
  const root = podcastSeedDir();
  const paths = scanAudio(root).sort().slice(0, MAX_SCAN);
  const tones: PodcastArtTone[] = ["teal", "green", "lime", "amber", "orange", "rose"];

  return paths.map((absPath, index) => {
    const fileName = path.basename(absPath);
    const id = `scan-${index}-${fileName.replace(/[^a-z0-9]+/gi, "-").slice(0, 24).toLowerCase()}`;
    scannedById.set(id, absPath);
    const showTitle = path.basename(path.dirname(absPath));
    return {
      id,
      title: path.basename(fileName, path.extname(fileName)),
      showTitle: showTitle === path.basename(root) ? "Downloads" : showTitle,
      host: "Local library",
      fileName,
      kind: "podcast" as const,
      artTone: tones[index % tones.length],
      durationLabel: "—",
    };
  });
}

export function listLocalEpisodes(): PodcastEpisodeStatus[] {
  const scanned = indexScanned();
  const all = [...PODCAST_EPISODE_SEEDS, ...scanned];

  return all.map((episode) => {
    if (episode.musicTrackId) {
      const resolved = resolveSeedTrack(episode.musicTrackId);
      return { ...episode, available: Boolean(resolved), source: "local" as const };
    }
    const absPath = scannedById.get(episode.id);
    return {
      ...episode,
      available: Boolean(absPath && fs.existsSync(absPath)),
      source: "local" as const,
    };
  });
}

export function resolveLocalEpisode(
  episodeId: string,
): { episode: PodcastEpisodeSeed; absPath: string; mimeType: string } | null {
  const scanned = indexScanned();
  const episode = [...PODCAST_EPISODE_SEEDS, ...scanned].find((entry) => entry.id === episodeId);
  if (!episode) return null;

  if (episode.musicTrackId) {
    const resolved = resolveSeedTrack(episode.musicTrackId);
    if (!resolved) return null;
    return { episode, absPath: resolved.absPath, mimeType: "audio/mpeg" };
  }

  const absPath = scannedById.get(episodeId);
  if (!absPath || !fs.existsSync(absPath)) return null;
  const ext = path.extname(absPath).toLowerCase();
  const mimeType =
    ext === ".m4a" ? "audio/mp4" : ext === ".wav" ? "audio/wav" : ext === ".ogg" ? "audio/ogg" : "audio/mpeg";
  return { episode, absPath, mimeType };
}

export function statLocalEpisode(
  episodeId: string,
): { episode: PodcastEpisodeSeed; absPath: string; mimeType: string; size: number } | null {
  const resolved = resolveLocalEpisode(episodeId);
  if (!resolved) return null;
  const size = fs.statSync(resolved.absPath).size;
  return { ...resolved, size };
}
