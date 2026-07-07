import crypto from "node:crypto";
import {
  MUSIC_RSS_AUDIO_BROADCAST_SEEDS,
  MUSIC_RSS_FEED_SEEDS,
  type MusicFeedSubscription,
  type MusicRssFeedCategory,
  type MusicRssFeedSeed,
} from "../../shared/musicFeeds.js";
import {
  addSubscribedMusicFeed,
  ensureAudioBroadcastFeeds,
  listSubscribedMusicFeedUrls,
  listSubscribedMusicFeeds,
  removeSubscribedMusicFeed,
} from "./musicFeedStore.js";

function resolveMusicRssFeeds(): string[] {
  const subscribed = listSubscribedMusicFeedUrls();
  if (subscribed.length > 0) return prioritizePlayableFeeds(subscribed);

  const fromEnv = process.env.MUSIC_RSS_FEEDS?.trim();
  if (fromEnv) {
    return prioritizePlayableFeeds(
      fromEnv
        .split(",")
        .map((entry: string) => entry.trim())
        .filter(Boolean),
    );
  }
  return MUSIC_RSS_AUDIO_BROADCAST_SEEDS.map((feed) => feed.url);
}

function prioritizePlayableFeeds(feedUrls: string[]): string[] {
  const audioUrls = new Set(MUSIC_RSS_AUDIO_BROADCAST_SEEDS.map((feed) => feed.url));
  const prioritized = [
    ...MUSIC_RSS_AUDIO_BROADCAST_SEEDS.map((feed) => feed.url).filter((url) => feedUrls.includes(url)),
    ...feedUrls.filter((url) => !audioUrls.has(url)),
  ];
  return [...new Set(prioritized)];
}

export function listMusicRssFeedSeeds(): MusicRssFeedSeed[] {
  const subscribed = listSubscribedMusicFeeds();
  if (subscribed.length > 0) {
    return subscribed.map(({ url, label, publisher, category }) => ({
      url,
      label,
      publisher,
      category,
    }));
  }

  const fromEnv = process.env.MUSIC_RSS_FEEDS?.trim();
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((entry: string) => entry.trim())
      .filter(Boolean)
      .map((url) => ({
        url,
        label: url,
        publisher: "Custom feed",
        category: "discovery" as MusicRssFeedCategory,
      }));
  }
  return MUSIC_RSS_FEED_SEEDS;
}

export { listSubscribedMusicFeeds, addSubscribedMusicFeed, removeSubscribedMusicFeed, ensureAudioBroadcastFeeds };

const WARM_FEED_URLS = MUSIC_RSS_AUDIO_BROADCAST_SEEDS.map((feed) => feed.url);

export function warmMusicRssFeeds(): void {
  ensureAudioBroadcastFeeds();
  for (const feedUrl of WARM_FEED_URLS) {
    void fetchFeedSongs(feedUrl).catch(() => undefined);
  }
}

export interface RssSongRecord {
  id: string;
  title: string;
  artists: string;
  summary: string;
  link: string;
  publishedAt: string;
  durationLabel: string;
  source: "rss";
  feedUrl: string;
  feedLabel: string;
  publisher: string;
  category: MusicRssFeedCategory;
  artTone: string;
  enclosureUrl: string;
  coverUrl?: string;
  available: boolean;
}

const ART_TONES = [
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
const MAX_SONGS_PER_FEED = 20;

interface FeedCacheEntry {
  fetchedAt: number;
  songs: RssSongRecord[];
  channelCoverUrl?: string;
}

const feedCache = new Map<string, FeedCacheEntry>();
const songIndex = new Map<string, RssSongRecord>();
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

function stripHtml(value: string): string {
  return decodeXml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
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

function songId(feedUrl: string, guid: string): string {
  const hash = crypto.createHash("sha256").update(`${feedUrl}\0${guid}`).digest("hex").slice(0, 16);
  return `music-rss-${hash}`;
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

function itemCoverFromBlock(item: string, channelCover?: string): string | undefined {
  return (
    attrValue(item, "media:thumbnail", "url") ??
    attrValue(item, "itunes:image", "href") ??
    tagValue(item, "itunes:image") ??
    channelCover
  );
}

function itemSummary(item: string): string {
  const raw =
    tagValue(item, "description") ??
    tagValue(item, "content:encoded") ??
    tagValue(item, "summary") ??
    "";
  const plain = stripHtml(raw);
  if (plain.length <= 220) return plain;
  return `${plain.slice(0, 217).trim()}…`;
}

function parseArtists(title: string, item: string, fallback: string): string {
  const explicit =
    tagValue(item, "itunes:author") ??
    tagValue(item, "dc:creator") ??
    tagValue(item, "author");
  if (explicit?.trim()) return explicit.trim();

  const split = title.split(/\s[-–—|:]\s/);
  if (split.length >= 2) return split[0].trim();
  return fallback;
}

function parseTrackTitle(title: string): string {
  const split = title.split(/\s[-–—|:]\s/);
  if (split.length >= 2) return split.slice(1).join(" - ").trim();
  return title.trim();
}

function enclosureFromItem(item: string): string | undefined {
  const enclosureUrl = attrValue(item, "enclosure", "url");
  if (enclosureUrl) {
    const type = (attrValue(item, "enclosure", "type") ?? "").toLowerCase();
    if (
      !type ||
      type.startsWith("audio/") ||
      type.includes("mpeg") ||
      /\.(mp3|m4a|wav|ogg|aac|flac)(\?|$)/i.test(enclosureUrl)
    ) {
      return enclosureUrl;
    }
  }

  for (const match of item.matchAll(/<media:content\b[^>]*>/gi)) {
    const block = match[0];
    const url = attrValue(block, "media:content", "url");
    const type = (attrValue(block, "media:content", "type") ?? "").toLowerCase();
    if (url && (!type || type.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|aac|flac)(\?|$)/i.test(url))) {
      return url;
    }
  }

  const encoded = tagValue(item, "content:encoded") ?? tagValue(item, "description") ?? "";
  const mp3Matches = [
    ...encoded.matchAll(/https?:\/\/[^\s"'<>]+\.(?:mp3|m4a|wav|ogg|aac|flac)(?:\?[^\s"'<>]*)?/gi),
  ];
  if (mp3Matches.length > 0) return decodeXml(mp3Matches[0][0]);

  return undefined;
}

function seedForFeed(feedUrl: string): MusicRssFeedSeed | undefined {
  return listMusicRssFeedSeeds().find((feed) => feed.url === feedUrl);
}

async function fetchFeedXml(feedUrl: string): Promise<string> {
  const inFlight = inFlightFeedRequests.get(feedUrl);
  if (inFlight) return inFlight;

  const request = (async () => {
    const response = await fetch(feedUrl, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": "Arco-Music/1.0",
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

function parseFeedXml(feedUrl: string, xml: string): { songs: RssSongRecord[]; channelCoverUrl?: string } {
  const channelMatch = /<channel\b[\s\S]*?<\/channel>/i.exec(xml);
  const channel = channelMatch?.[0] ?? xml;
  const channelTitle = tagValue(channel, "title") ?? "Music RSS";
  const seed = seedForFeed(feedUrl);
  const feedLabel = seed?.label ?? channelTitle;
  const publisher =
    seed?.publisher ??
    tagValue(channel, "itunes:author") ??
    tagValue(channel, "author") ??
    tagValue(channel, "managingEditor") ??
    "RSS";
  const category = seed?.category ?? "discovery";
  const channelCover = channelCoverFromBlock(channel);

  const itemBlocks = [...channel.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  const songs: RssSongRecord[] = [];

  for (const [index, item] of itemBlocks.entries()) {
    if (index >= MAX_SONGS_PER_FEED) break;

    const rawTitle = tagValue(item, "title");
    const enclosureUrl = enclosureFromItem(item);
    if (!rawTitle || !enclosureUrl) continue;

    const link = tagValue(item, "link") ?? enclosureUrl;
    const guid = tagValue(item, "guid") ?? link ?? `${rawTitle}-${index}`;
    const id = songId(feedUrl, guid);
    const publishedAt = tagValue(item, "pubDate") ?? new Date().toISOString();
    const artists = parseArtists(rawTitle, item, publisher);
    const title = parseTrackTitle(rawTitle);
    const coverUrl = itemCoverFromBlock(item, channelCover);

    const song: RssSongRecord = {
      id,
      title,
      artists,
      summary: itemSummary(item),
      link,
      publishedAt,
      durationLabel: formatDuration(tagValue(item, "itunes:duration")),
      source: "rss",
      feedUrl,
      feedLabel,
      publisher,
      category,
      artTone: ART_TONES[index % ART_TONES.length],
      enclosureUrl,
      coverUrl,
      available: true,
    };

    songs.push(song);
    songIndex.set(id, song);
  }

  return {
    songs: songs.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)),
    channelCoverUrl: channelCover,
  };
}

async function fetchFeedSongs(feedUrl: string): Promise<RssSongRecord[]> {
  const cached = feedCache.get(feedUrl);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.songs;
  }

  const xml = await fetchFeedXml(feedUrl);
  const parsed = parseFeedXml(feedUrl, xml);
  feedCache.set(feedUrl, { fetchedAt: Date.now(), ...parsed });
  return parsed.songs;
}

export function invalidateMusicFeedCache(feedUrl: string): void {
  feedCache.delete(feedUrl);
}

export async function fetchMusicFeedMetadata(
  feedUrl: string,
): Promise<{ url: string; label: string; publisher: string; category: MusicRssFeedCategory; coverUrl?: string }> {
  const seed = seedForFeed(feedUrl);
  const cached = feedCache.get(feedUrl);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    const sample = cached.songs[0];
    const coverUrl = cached.channelCoverUrl ?? cached.songs.find((song) => song.coverUrl)?.coverUrl;
    if (coverUrl || cached.songs.length > 0 || seed) {
      return {
        url: feedUrl,
        label: seed?.label ?? sample?.feedLabel ?? feedUrl,
        publisher: seed?.publisher ?? sample?.publisher ?? "RSS",
        category: seed?.category ?? sample?.category ?? "discovery",
        coverUrl,
      };
    }
  }

  const xml = await fetchFeedXml(feedUrl);
  const channelMatch = /<channel\b[\s\S]*?<\/channel>/i.exec(xml);
  const channel = channelMatch?.[0] ?? xml;
  const label = seed?.label ?? tagValue(channel, "title") ?? feedUrl;
  const publisher =
    seed?.publisher ??
    tagValue(channel, "itunes:author") ??
    tagValue(channel, "author") ??
    tagValue(channel, "managingEditor") ??
    "RSS";
  const coverUrl = channelCoverFromBlock(channel);

  if (!feedCache.has(feedUrl)) {
    feedCache.set(feedUrl, { fetchedAt: Date.now(), songs: [], channelCoverUrl: coverUrl });
  }

  return {
    url: feedUrl,
    label,
    publisher,
    category: seed?.category ?? "discovery",
    coverUrl,
  };
}

export async function listRssSongs(): Promise<RssSongRecord[]> {
  if (songIndex.size > 0) {
    return [...songIndex.values()].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  }

  const feeds = resolveMusicRssFeeds().slice(0, 12);
  await Promise.allSettled(feeds.map((feedUrl) => fetchFeedSongs(feedUrl)));

  return [...songIndex.values()].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export async function seedAudioBroadcastFeeds(): Promise<{
  feeds: MusicFeedSubscription[];
  added: number;
}> {
  const before = new Set(listSubscribedMusicFeedUrls());
  const feeds = ensureAudioBroadcastFeeds();
  const addedUrls = MUSIC_RSS_AUDIO_BROADCAST_SEEDS.map((seed) => seed.url).filter((url) => !before.has(url));

  await Promise.allSettled(addedUrls.map((feedUrl) => fetchFeedSongs(feedUrl)));
  for (const feedUrl of WARM_FEED_URLS) {
    void fetchFeedSongs(feedUrl).catch(() => undefined);
  }

  return { feeds, added: addedUrls.length };
}

export function resolveRssSong(songId: string): RssSongRecord | null {
  return songIndex.get(songId) ?? null;
}

async function resolveRssSongCached(songId: string, feedUrlHint?: string): Promise<RssSongRecord | null> {
  const cached = resolveRssSong(songId);
  if (cached) return cached;

  const feedsToTry = feedUrlHint
    ? prioritizePlayableFeeds([feedUrlHint, ...resolveMusicRssFeeds()])
    : resolveMusicRssFeeds();

  for (const feedUrl of feedsToTry.slice(0, 20)) {
    await fetchFeedSongs(feedUrl);
    const found = resolveRssSong(songId);
    if (found) return found;
  }

  return null;
}

async function proxyCoverUrl(
  coverUrl: string,
): Promise<{ body: ReadableStream<Uint8Array>; contentType: string } | null> {
  const response = await fetch(coverUrl, {
    headers: { "User-Agent": "Arco-Music/1.0" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok || !response.body) return null;
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  return { body: response.body, contentType };
}

export async function proxyMusicFeedCover(
  feedUrl: string,
): Promise<{ body: ReadableStream<Uint8Array>; contentType: string } | null> {
  const cached = feedCache.get(feedUrl);
  if (cached?.channelCoverUrl) {
    const proxied = await proxyCoverUrl(cached.channelCoverUrl);
    if (proxied) return proxied;
  }

  const metadata = await fetchMusicFeedMetadata(feedUrl);
  if (!metadata.coverUrl) return null;
  return proxyCoverUrl(metadata.coverUrl);
}

export async function proxyMusicSongCover(
  songId: string,
): Promise<{ body: ReadableStream<Uint8Array>; contentType: string } | null> {
  const song = await resolveRssSongCached(songId);
  if (!song?.coverUrl) return null;
  return proxyCoverUrl(song.coverUrl);
}

export async function proxyMusicRssEnclosure(
  songId: string,
  rangeHeader?: string | null,
  feedUrlHint?: string | null,
): Promise<{ body: ReadableStream<Uint8Array>; status: number; headers: Record<string, string> } | null> {
  const song = await resolveRssSongCached(songId, feedUrlHint?.trim() || undefined);
  if (!song) return null;

  const headers: Record<string, string> = {
    Accept: "audio/*,*/*",
    "User-Agent": "Arco-Music/1.0",
  };
  if (rangeHeader) headers.Range = rangeHeader;

  const response = await fetch(song.enclosureUrl, {
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

export { fetchFeedSongs as fetchMusicFeedSongs };
