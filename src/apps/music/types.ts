import type { MusicRssFeedCategory } from "@shared/musicFeeds";

export type MusicLibraryFilter = "playlists" | "artists" | "albums" | "podcasts";

export type MusicNavSection = "home" | "broadcasts" | MusicLibraryFilter;

export type MusicContentFilter = "all" | "music" | "podcasts" | "audiobooks";

export type MusicImageTone =
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

export interface MusicLibraryItem {
  id: string;
  title: string;
  subtitle: string;
  kind: "playlist" | "artist" | "album" | "podcast";
  imageTone: MusicImageTone;
  /** Track id used for embedded album art (e.g. album rows). */
  coverTrackId?: string;
}

export interface MusicQuickAccess {
  id: string;
  title: string;
  imageTone: MusicImageTone;
}

export interface MusicFeaturedCard {
  id: string;
  sectionTitle: string;
  title: string;
  description: string;
  label: string;
  imageTone: MusicImageTone;
}

export interface MusicMixCard {
  id: string;
  number: string;
  title: string;
  artists: string[];
  imageTone: MusicImageTone;
}

export interface MusicTrack {
  id: string;
  title: string;
  artists: string;
  albumArtTone: MusicImageTone;
  duration: string;
  hasVideo?: boolean;
  source?: "local" | "rss" | "live";
  /** Local seed or proxied RSS/live stream URL */
  previewSrc?: string;
  /** True for continuous live radio streams (no seek, no auto-advance). */
  live?: boolean;
}

export interface MusicRelatedVideo {
  id: string;
  title: string;
  artists: string;
  imageTone: MusicImageTone;
}

export interface MusicNowPlaying {
  track: MusicTrack;
  queueTitle?: string;
  progress: number;
  elapsed: string;
  relatedVideos: MusicRelatedVideo[];
}

export interface MusicUser {
  name: string;
  avatarSrc?: string;
}

export interface MusicBroadcastSong {
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
  source: "rss";
  previewSrc?: string;
}
