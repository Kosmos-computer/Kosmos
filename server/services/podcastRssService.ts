import crypto from "node:crypto";
import { PODCAST_RSS_FEED_SEEDS, type PodcastRssFeedSeed } from "../../shared/podcastFeeds.js";
import {
  addSubscribedFeed,
  listSubscribedFeedUrls,
  listSubscribedFeeds,
  removeSubscribedFeed,
} from "./podcastFeedStore.js";
import type { PodcastArtTone } from "./podcastSeedService.js";

function resolvePodcastRssFeeds(): string[] {
  const subscribed = listSubscribedFeedUrls();
  if (subscribed.length > 0) return subscribed;

  const fromEnv = process.env.PODCAST_RSS_FEEDS?.trim();
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((entry: string) => entry.trim())
      .filter(Boolean);
  }
  return PODCAST_RSS_FEED_SEEDS.map((feed) => feed.url);
}

export function listPodcastRssFeedSeeds(): PodcastRssFeedSeed[] {
  const subscribed = listSubscribedFeeds();
  if (subscribed.length > 0) {
    return subscribed.map(({ url, label, publisher }) => ({ url, label, publisher }));
  }

  const fromEnv = process.env.PODCAST_RSS_FEEDS?.trim();
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((entry: string) => entry.trim())
      .filter(Boolean)
      .map((url) => ({ url, label: url, publisher: "Custom feed" }));
  }
  return PODCAST_RSS_FEED_SEEDS;
}

export { listSubscribedFeeds, addSubscribedFeed, removeSubscribedFeed };

export function warmPodcastRssFeeds(): void {
  void listRssEpisodes().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : "RSS warm failed";
    console.warn(`[podcast] RSS feed warm failed: ${message}`);
  });
}

export interface RssEpisodeRecord {
  id: string;
  title: string;
  showTitle: string;
  host: string;
  durationLabel: string;
  publishedAt: string;
  kind: "podcast";
  artTone: PodcastArtTone;
  available: boolean;
  source: "rss";
  feedUrl: string;
  enclosureUrl: string;
  coverUrl?: string;
  listenUrl?: string;
}

const ART_TONES: PodcastArtTone[] = [
  "teal",
  "green",
  "lime",
  "amber",
  "orange",
  "rose",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "purple",
  "pink",
];

const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_EPISODES_PER_FEED = 20;

interface FeedCacheEntry {
  fetchedAt: number;
  episodes: RssEpisodeRecord[];
  channelCoverUrl?: string;
}

const feedCache = new Map<string, FeedCacheEntry>();
const episodeIndex = new Map<string, RssEpisodeRecord>();
const inFlightFeedRequests = new Map<string, Promise<string>>();

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function tagValue(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = re.exec(block);
  return match ? decodeXml(match[1].trim()) : undefined;
}

function attrValue(block: string, tag: string, attr: string): string | undefined {
  const re = new RegExp(`<${tag}\\b[^>]*\\s${attr}=["']([^"']+)["']`, "i");
  const match = re.exec(block);
  return match?.[1] ? decodeXml(match[1]) : undefined;
}

function formatDuration(raw: string | undefined): string {
  if (!raw?.trim()) return "—";
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) {
    const total = Number(trimmed);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  const parts = trimmed.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return trimmed;
  if (parts.length === 3) {
    const mins = parts[0] * 60 + parts[1];
    return `${mins}:${parts[2].toString().padStart(2, "0")}`;
  }
  if (parts.length === 2) {
    return `${parts[0]}:${parts[1].toString().padStart(2, "0")}`;
  }
  return trimmed;
}

function episodeId(feedUrl: string, guid: string): string {
  const hash = crypto.createHash("sha256").update(`${feedUrl}\0${guid}`).digest("hex").slice(0, 16);
  return `rss-${hash}`;
}

function channelCoverFromBlock(channel: string): string | undefined {
  const imageBlock = channel.match(/<image\b[\s\S]*?<\/image>/i)?.[0];
  return (
    attrValue(channel, "itunes:image", "href") ??
    (imageBlock ? tagValue(imageBlock, "url") : undefined) ??
    (imageBlock ? tagValue(imageBlock, "link") : undefined) ??
    attrValue(channel, "media:thumbnail", "url") ??
    tagValue(channel, "logo") ??
    tagValue(channel, "icon")
  );
}

async function fetchFeedXml(feedUrl: string): Promise<string> {
  const inFlight = inFlightFeedRequests.get(feedUrl);
  if (inFlight) return inFlight;

  const request = (async () => {
    const response = await fetch(feedUrl, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": "Arco-Podcasts/1.0",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`Feed request failed (${response.status})`);
    }

    return response.text();
  })();

  inFlightFeedRequests.set(feedUrl, request);
  try {
    return await request;
  } finally {
    inFlightFeedRequests.delete(feedUrl);
  }
}

function parseFeedXml(
  feedUrl: string,
  xml: string,
): { episodes: RssEpisodeRecord[]; channelCoverUrl?: string } {
  const channelMatch = /<channel\b[\s\S]*?<\/channel>/i.exec(xml);
  const channel = channelMatch?.[0] ?? xml;
  const showTitle = tagValue(channel, "title") ?? "RSS Podcast";
  const host =
    tagValue(channel, "itunes:author") ??
    tagValue(channel, "author") ??
    tagValue(channel, "managingEditor") ??
    "RSS";
  const channelCover = channelCoverFromBlock(channel);

  const itemBlocks = [...channel.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  const episodes: RssEpisodeRecord[] = [];

  for (const [index, item] of itemBlocks.entries()) {
    if (index >= MAX_EPISODES_PER_FEED) break;

    const title = tagValue(item, "title");
    const enclosureUrl = attrValue(item, "enclosure", "url");
    if (!title || !enclosureUrl) continue;

    const guid = tagValue(item, "guid") ?? tagValue(item, "link") ?? `${title}-${index}`;
    const id = episodeId(feedUrl, guid);
    const publishedAt = tagValue(item, "pubDate") ?? new Date().toISOString();
    const durationLabel = formatDuration(tagValue(item, "itunes:duration"));
    const listenUrl = tagValue(item, "link");
    const itemCover =
      attrValue(item, "itunes:image", "href") ?? tagValue(item, "itunes:image") ?? channelCover;

    const episode: RssEpisodeRecord = {
      id,
      title,
      showTitle,
      host,
      durationLabel,
      publishedAt,
      kind: "podcast",
      artTone: ART_TONES[index % ART_TONES.length],
      available: true,
      source: "rss",
      feedUrl,
      enclosureUrl,
      coverUrl: itemCover,
      listenUrl,
    };

    episodes.push(episode);
    episodeIndex.set(id, episode);
  }

  return {
    episodes: episodes.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)),
    channelCoverUrl: channelCover,
  };
}

async function fetchFeedEpisodes(feedUrl: string): Promise<RssEpisodeRecord[]> {
  const cached = feedCache.get(feedUrl);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.episodes;
  }

  const xml = await fetchFeedXml(feedUrl);
  const parsed = parseFeedXml(feedUrl, xml);
  feedCache.set(feedUrl, { fetchedAt: Date.now(), ...parsed });
  return parsed.episodes;
}

export { fetchFeedEpisodes };

export function invalidateFeedCache(feedUrl: string): void {
  feedCache.delete(feedUrl);
}

export async function fetchFeedMetadata(
  feedUrl: string,
): Promise<{ url: string; label: string; publisher: string; coverUrl?: string }> {
  const cached = feedCache.get(feedUrl);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    const sample = cached.episodes[0];
    const coverUrl =
      cached.channelCoverUrl ?? cached.episodes.find((episode) => episode.coverUrl)?.coverUrl;
    if (coverUrl || cached.episodes.length > 0) {
      return {
        url: feedUrl,
        label: sample?.showTitle ?? feedUrl,
        publisher: sample?.host ?? "RSS",
        coverUrl,
      };
    }
  }

  const xml = await fetchFeedXml(feedUrl);
  const channelMatch = /<channel\b[\s\S]*?<\/channel>/i.exec(xml);
  const channel = channelMatch?.[0] ?? xml;
  const label = tagValue(channel, "title") ?? feedUrl;
  const publisher =
    tagValue(channel, "itunes:author") ??
    tagValue(channel, "author") ??
    tagValue(channel, "managingEditor") ??
    "RSS";
  const coverUrl = channelCoverFromBlock(channel);

  if (!feedCache.has(feedUrl)) {
    feedCache.set(feedUrl, { fetchedAt: Date.now(), episodes: [], channelCoverUrl: coverUrl });
  }

  return { url: feedUrl, label, publisher, coverUrl };
}

async function resolveFeedCoverUrl(feedUrl: string): Promise<string | undefined> {
  const cached = feedCache.get(feedUrl);
  if (cached?.channelCoverUrl) return cached.channelCoverUrl;

  const metadata = await fetchFeedMetadata(feedUrl);
  if (metadata.coverUrl) return metadata.coverUrl;

  const episodes = cached?.episodes.length ? cached.episodes : await fetchFeedEpisodes(feedUrl);
  return episodes.find((episode) => episode.coverUrl)?.coverUrl;
}

export async function listRssEpisodes(): Promise<RssEpisodeRecord[]> {
  const feeds = resolvePodcastRssFeeds();
  const results = await Promise.allSettled(feeds.map((feedUrl) => fetchFeedEpisodes(feedUrl)));

  const episodes: RssEpisodeRecord[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      episodes.push(...result.value);
    }
  }

  return episodes.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function resolveRssEpisode(episodeId: string): RssEpisodeRecord | null {
  return episodeIndex.get(episodeId) ?? null;
}

async function resolveRssEpisodeCached(episodeId: string): Promise<RssEpisodeRecord | null> {
  const cached = resolveRssEpisode(episodeId);
  if (cached) return cached;
  await listRssEpisodes();
  return resolveRssEpisode(episodeId);
}

export async function proxyRssEnclosure(
  episodeId: string,
  rangeHeader?: string | null,
): Promise<{ body: ReadableStream<Uint8Array>; status: number; headers: Record<string, string> } | null> {
  const episode = await resolveRssEpisodeCached(episodeId);
  if (!episode) return null;

  const headers: Record<string, string> = {
    Accept: "audio/*,*/*",
    "User-Agent": "Arco-Podcasts/1.0",
  };
  if (rangeHeader) headers.Range = rangeHeader;

  const response = await fetch(episode.enclosureUrl, {
    headers,
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok || !response.body) return null;

  const outHeaders: Record<string, string> = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
  };

  const contentType = response.headers.get("content-type");
  if (contentType) outHeaders["Content-Type"] = contentType;

  const contentLength = response.headers.get("content-length");
  if (contentLength) outHeaders["Content-Length"] = contentLength;

  const contentRange = response.headers.get("content-range");
  if (contentRange) outHeaders["Content-Range"] = contentRange;

  return {
    body: response.body,
    status: response.status,
    headers: outHeaders,
  };
}

async function proxyCoverUrl(
  coverUrl: string,
): Promise<{ body: ReadableStream<Uint8Array>; contentType: string } | null> {
  const response = await fetch(coverUrl, {
    headers: { "User-Agent": "Arco-Podcasts/1.0" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok || !response.body) return null;
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  return { body: response.body, contentType };
}

export async function proxyRssCover(
  episodeId: string,
): Promise<{ body: ReadableStream<Uint8Array>; contentType: string } | null> {
  const episode = await resolveRssEpisodeCached(episodeId);
  if (!episode?.coverUrl) return null;
  return proxyCoverUrl(episode.coverUrl);
}

export async function proxyFeedCover(
  feedUrl: string,
): Promise<{ body: ReadableStream<Uint8Array>; contentType: string } | null> {
  const coverUrl = await resolveFeedCoverUrl(feedUrl);
  if (!coverUrl) return null;
  return proxyCoverUrl(coverUrl);
}
