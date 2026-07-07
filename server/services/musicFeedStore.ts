import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  MUSIC_RSS_AUDIO_BROADCAST_SEEDS,
  type MusicFeedSubscription,
  type MusicRssFeedSeed,
} from "../../shared/musicFeeds.js";
import { dataDirs } from "../env.js";

const FILE = path.join(dataDirs.root, "music-feeds.json");

interface MusicFeedsFile {
  feeds: MusicFeedSubscription[];
}

function feedId(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
}

function resolveInitialSeeds(): MusicRssFeedSeed[] {
  const fromEnv = process.env.MUSIC_RSS_FEEDS?.trim();
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((url) => ({
        url,
        label: url,
        publisher: "Custom feed",
        category: "discovery" as const,
      }));
  }
  // Default to playable audio broadcasts; full Feedspot list is article-heavy.
  return MUSIC_RSS_AUDIO_BROADCAST_SEEDS;
}

export function ensureAudioBroadcastFeeds(): MusicFeedSubscription[] {
  const file = load();
  const existing = new Set(file.feeds.map((feed) => feed.url));
  let changed = false;
  for (const seed of MUSIC_RSS_AUDIO_BROADCAST_SEEDS) {
    if (existing.has(seed.url)) continue;
    file.feeds.push({
      id: feedId(seed.url),
      ...seed,
      addedAt: new Date().toISOString(),
    });
    existing.add(seed.url);
    changed = true;
  }
  if (changed) save(file);
  return file.feeds;
}

function seedSubscriptions(): MusicFeedSubscription[] {
  const now = new Date().toISOString();
  return resolveInitialSeeds().map((seed) => ({
    id: feedId(seed.url),
    url: seed.url,
    label: seed.label,
    publisher: seed.publisher,
    category: seed.category,
    addedAt: now,
  }));
}

function load(): MusicFeedsFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf-8")) as Partial<MusicFeedsFile>;
    if (parsed.feeds && parsed.feeds.length > 0) {
      return { feeds: parsed.feeds };
    }
  } catch {
    // First run — seed below.
  }

  const feeds = seedSubscriptions();
  save({ feeds });
  return { feeds };
}

function save(file: MusicFeedsFile): void {
  fs.mkdirSync(dataDirs.root, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(file, null, 2), "utf-8");
}

export function listSubscribedMusicFeeds(): MusicFeedSubscription[] {
  return load().feeds;
}

export function listSubscribedMusicFeedUrls(): string[] {
  return listSubscribedMusicFeeds().map((feed) => feed.url);
}

export function findSubscribedMusicFeed(feedIdOrUrl: string): MusicFeedSubscription | undefined {
  const feeds = listSubscribedMusicFeeds();
  return feeds.find((feed) => feed.id === feedIdOrUrl || feed.url === feedIdOrUrl);
}

export function addSubscribedMusicFeed(input: MusicRssFeedSeed): MusicFeedSubscription {
  const normalizedUrl = input.url.trim();
  const file = load();
  const existing = file.feeds.find((feed) => feed.url === normalizedUrl);
  if (existing) return existing;

  const subscription: MusicFeedSubscription = {
    id: feedId(normalizedUrl),
    url: normalizedUrl,
    label: input.label,
    publisher: input.publisher,
    category: input.category,
    addedAt: new Date().toISOString(),
  };
  file.feeds.push(subscription);
  save(file);
  return subscription;
}

export function removeSubscribedMusicFeed(feedId: string): boolean {
  const file = load();
  const next = file.feeds.filter((feed) => feed.id !== feedId);
  if (next.length === file.feeds.length) return false;
  save({ feeds: next });
  return true;
}
