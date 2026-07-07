export type PodcastEpisodeDetailTab = "episode" | "transcript";

export type PodcastNavSection =
  | "main-feed"
  | "home"
  | "browse"
  | "library"
  | "downloads"
  | "transcripts"
  | "settings";

export type PodcastContentFilter = "all" | "podcasts" | "audiobooks";

export type PodcastSourceFilter = "local" | "rss" | "remote";

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

export interface PodcastEpisode {
  id: string;
  title: string;
  showTitle: string;
  host: string;
  durationLabel: string;
  publishedAt?: string;
  kind: "podcast" | "audiobook";
  artTone: PodcastArtTone;
  source: "local" | "rss" | "remote";
  provider?: "spotify" | "apple-podcasts" | "audible";
  streamSrc?: string;
  listenUrl?: string;
  coverUrl?: string;
  feedUrl?: string;
}

export interface PodcastShow {
  id: string;
  title: string;
  host: string;
  episodeCount: number;
  artTone: PodcastArtTone;
  /** RSS feed URL — used to scope episodes to one subscribed show. */
  feedUrl?: string;
}

export type PodcastFeedModuleKind = "continue" | "new-episode" | "show" | "discover";

export interface PodcastFeedModule {
  id: string;
  kind: PodcastFeedModuleKind;
  title: string;
  subtitle: string;
  description: string;
  episodeCount?: number;
  episode?: PodcastEpisode;
  show?: PodcastShow;
  artTone: PodcastArtTone;
}

export interface PodcastNowPlaying {
  episode: PodcastEpisode;
  progress: number;
  elapsed: string;
  duration: string;
}

export interface PodcastProviderRail {
  id: "spotify" | "apple-podcasts" | "audible";
  label: string;
  initials: string;
  accent: string;
}
