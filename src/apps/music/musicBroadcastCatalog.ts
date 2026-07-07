import {
  MUSIC_RSS_AUDIO_BROADCAST_SEEDS,
  MUSIC_RSS_FEED_CATEGORY_LABELS,
  MUSIC_RSS_FEED_SEEDS,
  type MusicFeedSubscription,
  type MusicRssFeedCategory,
} from "@shared/musicFeeds";
import { musicRssArtPath, musicRssFeedArtPath, musicRssStreamPath } from "@shared/mediaPaths";
import type { MusicBroadcastSong, MusicImageTone } from "./types";

const ART_TONES: MusicImageTone[] = [
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

export interface RssSongRecord {
  id: string;
  title: string;
  artists: string;
  summary: string;
  link: string;
  publishedAt: string;
  durationLabel: string;
  feedUrl: string;
  feedLabel: string;
  publisher: string;
  category: MusicRssFeedCategory;
  artTone: MusicImageTone;
  coverUrl?: string;
  available: boolean;
  source: "rss";
}

export function broadcastArtTone(label: string): MusicImageTone {
  let hash = 0;
  for (const char of label) hash = (hash + char.charCodeAt(0)) % ART_TONES.length;
  return ART_TONES[hash] ?? "teal";
}

export function rssToBroadcastSong(record: RssSongRecord): MusicBroadcastSong {
  return {
    id: record.id,
    title: record.title,
    artists: record.artists,
    summary: record.summary,
    link: record.link,
    publishedAt: record.publishedAt,
    durationLabel: record.durationLabel,
    feedUrl: record.feedUrl,
    feedLabel: record.feedLabel,
    publisher: record.publisher,
    category: record.category,
    artTone: record.artTone,
    coverUrl: record.coverUrl,
    source: "rss",
    previewSrc: musicRssStreamPath(record.id, record.feedUrl),
  };
}

export function broadcastSongCoverSrc(songId: string): string {
  return musicRssArtPath(songId);
}

export function broadcastFeedArtSrc(feedUrl: string): string {
  return musicRssFeedArtPath(feedUrl);
}

export function isPlayableBroadcastSong(song: MusicBroadcastSong): boolean {
  return song.source === "rss" && Boolean(song.previewSrc);
}

export function missingAudioBroadcastFeeds(feeds: MusicFeedSubscription[]): boolean {
  const subscribed = new Set(feeds.map((feed) => feed.url));
  return MUSIC_RSS_AUDIO_BROADCAST_SEEDS.some((seed) => !subscribed.has(seed.url));
}

export function filterBroadcastFeeds(
  feeds: MusicFeedSubscription[],
  query: string,
  category: MusicRssFeedCategory | "all",
): MusicFeedSubscription[] {
  let list = feeds;
  if (category !== "all") {
    list = list.filter((feed) => feed.category === category);
  }

  const needle = query.trim().toLowerCase();
  if (!needle) return list;
  return list.filter(
    (feed) =>
      feed.label.toLowerCase().includes(needle) ||
      feed.publisher.toLowerCase().includes(needle) ||
      MUSIC_RSS_FEED_CATEGORY_LABELS[feed.category].toLowerCase().includes(needle),
  );
}

export function groupedBroadcastFeeds(
  feeds: MusicFeedSubscription[],
): Map<MusicRssFeedCategory, MusicFeedSubscription[]> {
  const grouped = new Map<MusicRssFeedCategory, MusicFeedSubscription[]>();
  for (const feed of feeds) {
    const bucket = grouped.get(feed.category) ?? [];
    bucket.push(feed);
    grouped.set(feed.category, bucket);
  }
  return grouped;
}

export function filterBroadcastSongs(songs: MusicBroadcastSong[], query: string): MusicBroadcastSong[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return songs;
  return songs.filter(
    (song) =>
      song.title.toLowerCase().includes(needle) ||
      song.artists.toLowerCase().includes(needle) ||
      song.feedLabel.toLowerCase().includes(needle) ||
      song.publisher.toLowerCase().includes(needle),
  );
}

export function songsForFeed(songs: MusicBroadcastSong[], feedUrl: string): MusicBroadcastSong[] {
  return songs.filter((song) => song.feedUrl === feedUrl);
}

export { MUSIC_RSS_FEED_CATEGORY_LABELS, MUSIC_RSS_FEED_SEEDS };
export type { MusicRssFeedCategory };

export const BROADCAST_FEED_CATEGORIES = (
  Object.entries(MUSIC_RSS_FEED_CATEGORY_LABELS) as [MusicRssFeedCategory, string][]
).map(([id, label]) => ({ id, label }));
