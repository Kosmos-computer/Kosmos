import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  PODCAST_RSS_FEED_SEEDS,
  type PodcastFeedSubscription,
  type PodcastRssFeedSeed,
} from "../../shared/podcastFeeds.js";
import { dataDirs } from "../env.js";

const FILE = path.join(dataDirs.root, "podcast-feeds.json");

interface PodcastFeedsFile {
  feeds: PodcastFeedSubscription[];
}

function feedId(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
}

function resolveInitialSeeds(): PodcastRssFeedSeed[] {
  const fromEnv = process.env.PODCAST_RSS_FEEDS?.trim();
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((url) => ({ url, label: url, publisher: "Custom feed" }));
  }
  return PODCAST_RSS_FEED_SEEDS;
}

function seedSubscriptions(): PodcastFeedSubscription[] {
  const now = new Date().toISOString();
  return resolveInitialSeeds().map((seed) => ({
    id: feedId(seed.url),
    url: seed.url,
    label: seed.label,
    publisher: seed.publisher,
    addedAt: now,
    autoDownload: true,
  }));
}

function load(): PodcastFeedsFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf-8")) as Partial<PodcastFeedsFile>;
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

function save(file: PodcastFeedsFile): void {
  fs.mkdirSync(dataDirs.root, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(file, null, 2), "utf-8");
}

export function listSubscribedFeeds(): PodcastFeedSubscription[] {
  return load().feeds;
}

export function listSubscribedFeedUrls(): string[] {
  return listSubscribedFeeds().map((feed) => feed.url);
}

export function findSubscribedFeed(feedIdOrUrl: string): PodcastFeedSubscription | undefined {
  const feeds = listSubscribedFeeds();
  return feeds.find((feed) => feed.id === feedIdOrUrl || feed.url === feedIdOrUrl);
}

export function addSubscribedFeed(input: {
  url: string;
  label: string;
  publisher: string;
}): PodcastFeedSubscription {
  const normalizedUrl = input.url.trim();
  const file = load();
  const existing = file.feeds.find((feed) => feed.url === normalizedUrl);
  if (existing) return existing;

  const subscription: PodcastFeedSubscription = {
    id: feedId(normalizedUrl),
    url: normalizedUrl,
    label: input.label,
    publisher: input.publisher,
    addedAt: new Date().toISOString(),
    autoDownload: true,
  };
  file.feeds.push(subscription);
  save(file);
  return subscription;
}

export function removeSubscribedFeed(feedId: string): boolean {
  const file = load();
  const next = file.feeds.filter((feed) => feed.id !== feedId);
  if (next.length === file.feeds.length) return false;
  save({ feeds: next });
  return true;
}
