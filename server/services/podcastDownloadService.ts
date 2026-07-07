import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dataDirs } from "../env.js";
import { listSubscribedFeeds } from "./podcastFeedStore.js";
import { fetchFeedEpisodes, invalidateFeedCache, type RssEpisodeRecord } from "./podcastRssService.js";
import { podcastSeedDir } from "./podcastSeedService.js";

const MANIFEST_FILE = path.join(dataDirs.root, "podcast-downloads.json");
const MAX_NEW_PER_FEED = 5;

interface DownloadRecord {
  episodeId: string;
  feedUrl: string;
  guid: string;
  filePath: string;
  downloadedAt: string;
}

interface DownloadManifest {
  records: DownloadRecord[];
}

const EMPTY: DownloadManifest = { records: [] };

function loadManifest(): DownloadManifest {
  try {
    const parsed = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf-8")) as Partial<DownloadManifest>;
    if (parsed.records) return { records: parsed.records };
  } catch {
    // Fresh manifest.
  }
  return { ...EMPTY };
}

function saveManifest(manifest: DownloadManifest): void {
  fs.mkdirSync(dataDirs.root, { recursive: true });
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf-8");
}

function sanitizePathSegment(value: string): string {
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
    // Fall through to default.
  }
  return ".mp3";
}

function episodeGuid(episode: RssEpisodeRecord): string {
  return crypto.createHash("sha256").update(`${episode.feedUrl}\0${episode.id}`).digest("hex");
}

async function downloadEpisodeFile(episode: RssEpisodeRecord): Promise<string | null> {
  const showDir = path.join(podcastSeedDir(), sanitizePathSegment(episode.showTitle));
  fs.mkdirSync(showDir, { recursive: true });

  const fileName = `${sanitizePathSegment(episode.title)}${extensionFromUrl(episode.enclosureUrl)}`;
  const dest = path.join(showDir, fileName);
  if (fs.existsSync(dest)) return dest;

  const response = await fetch(episode.enclosureUrl, {
    headers: {
      Accept: "audio/*,*/*",
      "User-Agent": "Arco-Podcasts/1.0",
    },
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) return null;
  const data = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(dest, data);
  return dest;
}

export interface PodcastSyncResult {
  downloaded: number;
  skipped: number;
  errors: string[];
}

export async function syncPodcastDownloads(): Promise<PodcastSyncResult> {
  const manifest = loadManifest();
  const knownIds = new Set(manifest.records.map((record) => record.episodeId));
  const result: PodcastSyncResult = { downloaded: 0, skipped: 0, errors: [] };

  const feeds = listSubscribedFeeds().filter((feed) => feed.autoDownload);
  for (const feed of feeds) {
    let episodes: RssEpisodeRecord[];
    try {
      episodes = await fetchFeedEpisodes(feed.url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Feed fetch failed";
      result.errors.push(`${feed.label}: ${message}`);
      continue;
    }

    let newCount = 0;
    for (const episode of episodes) {
      if (knownIds.has(episode.id)) {
        result.skipped += 1;
        continue;
      }
      if (newCount >= MAX_NEW_PER_FEED) break;

      try {
        const filePath = await downloadEpisodeFile(episode);
        if (!filePath) {
          result.errors.push(`${feed.label}: failed to download "${episode.title}"`);
          continue;
        }
        manifest.records.push({
          episodeId: episode.id,
          feedUrl: episode.feedUrl,
          guid: episodeGuid(episode),
          filePath,
          downloadedAt: new Date().toISOString(),
        });
        knownIds.add(episode.id);
        result.downloaded += 1;
        newCount += 1;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Download failed";
        result.errors.push(`${feed.label}: "${episode.title}" — ${message}`);
      }
    }
  }

  saveManifest(manifest);
  return result;
}

export function warmPodcastDownloads(): void {
  void syncPodcastDownloads().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "Download sync failed";
    console.warn(`[podcast] Auto-download sync failed: ${message}`);
  });
}

export function clearFeedDownloadCache(feedUrl: string): void {
  invalidateFeedCache(feedUrl);
}
