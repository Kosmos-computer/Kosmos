import { podcastArtPath, podcastFeedArtPath, podcastStreamPath } from "@shared/mediaPaths";
import type { PodcastArtTone, PodcastEpisode, PodcastProviderRail, PodcastShow } from "./types";

export interface LocalEpisodeRecord {
  id: string;
  title: string;
  showTitle: string;
  host: string;
  durationLabel: string;
  kind: "podcast" | "audiobook";
  artTone: PodcastArtTone;
  available: boolean;
  source: "local";
  musicTrackId?: string;
}

export interface RemoteEpisodeRecord {
  id: string;
  title: string;
  showTitle: string;
  host: string;
  durationLabel: string;
  publishedAt: string;
  kind: "podcast" | "audiobook";
  listenUrl: string;
  provider: "spotify" | "apple-podcasts" | "audible";
  source: "remote";
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

export function localToEpisode(record: LocalEpisodeRecord): PodcastEpisode {
  return {
    id: record.id,
    title: record.title,
    showTitle: record.showTitle,
    host: record.host,
    durationLabel: record.durationLabel,
    kind: record.kind,
    artTone: record.artTone,
    source: "local",
    streamSrc: podcastStreamPath(record.id),
  };
}

export function remoteToEpisode(record: RemoteEpisodeRecord): PodcastEpisode {
  return {
    id: record.id,
    title: record.title,
    showTitle: record.showTitle,
    host: record.host,
    durationLabel: record.durationLabel,
    publishedAt: record.publishedAt,
    kind: record.kind,
    artTone: "teal",
    source: "remote",
    provider: record.provider,
    listenUrl: record.listenUrl,
  };
}

export function rssToEpisode(record: RssEpisodeRecord): PodcastEpisode {
  return {
    id: record.id,
    title: record.title,
    showTitle: record.showTitle,
    host: record.host,
    durationLabel: record.durationLabel,
    publishedAt: record.publishedAt,
    kind: record.kind,
    artTone: record.artTone,
    source: "rss",
    streamSrc: podcastStreamPath(record.id),
    coverUrl: record.coverUrl,
    listenUrl: record.listenUrl,
    feedUrl: record.feedUrl,
  };
}

export function isPlayableEpisode(episode: PodcastEpisode): boolean {
  return episode.source === "local" || episode.source === "rss";
}

export function filterEpisodes(
  episodes: PodcastEpisode[],
  query: string,
  contentFilter: "all" | "podcasts" | "audiobooks",
): PodcastEpisode[] {
  let list = episodes;
  if (contentFilter === "podcasts") list = list.filter((e) => e.kind === "podcast");
  if (contentFilter === "audiobooks") list = list.filter((e) => e.kind === "audiobook");

  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    (episode) =>
      episode.title.toLowerCase().includes(q) ||
      episode.showTitle.toLowerCase().includes(q) ||
      episode.host.toLowerCase().includes(q),
  );
}

function showGroupKey(episode: PodcastEpisode): string {
  return episode.feedUrl ?? episode.showTitle;
}

function showIdFromEpisode(episode: PodcastEpisode): string {
  if (episode.feedUrl) {
    return `feed:${episode.feedUrl}`;
  }
  return episode.showTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function episodesForShow(episodes: PodcastEpisode[], show: PodcastShow): PodcastEpisode[] {
  if (show.feedUrl) {
    return episodes.filter((episode) => episode.feedUrl === show.feedUrl);
  }
  return episodes.filter((episode) => episode.showTitle === show.title);
}

export function episodeBelongsToShow(episode: PodcastEpisode, show: PodcastShow): boolean {
  if (show.feedUrl) return episode.feedUrl === show.feedUrl;
  return episode.showTitle === show.title;
}

export function sortEpisodesNewestFirst(episodes: PodcastEpisode[]): PodcastEpisode[] {
  return [...episodes].sort((a, b) => {
    const aDate = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bDate = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return bDate - aDate;
  });
}

export function buildShows(episodes: PodcastEpisode[]): PodcastShow[] {
  const map = new Map<string, PodcastShow>();
  for (const episode of episodes) {
    const key = showGroupKey(episode);
    const existing = map.get(key);
    if (existing) {
      existing.episodeCount += 1;
      continue;
    }
    map.set(key, {
      id: showIdFromEpisode(episode),
      title: episode.showTitle,
      host: episode.host,
      episodeCount: 1,
      artTone: episode.artTone,
      feedUrl: episode.feedUrl,
    });
  }
  return [...map.values()];
}

export const PODCAST_PROVIDERS: PodcastProviderRail[] = [
  { id: "spotify", label: "Spotify", initials: "Sp", accent: "#1db954" },
  { id: "apple-podcasts", label: "Apple Podcasts", initials: "AP", accent: "#fa2d48" },
  { id: "audible", label: "Audible", initials: "Au", accent: "#f8991c" },
];

export function formatPodcastTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function podcastCoverSrc(episodeId: string): string {
  return podcastArtPath(episodeId);
}

export { podcastFeedArtPath };
