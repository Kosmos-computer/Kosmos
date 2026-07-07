export type VideoNavSection = "home" | "explore" | "subscriptions" | "library" | "history";

export type VideoSourceFilter = "local" | "remote";

export type VideoArtTone =
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

export interface VideoItem {
  id: string;
  title: string;
  channel: string;
  durationLabel: string;
  viewCount?: string;
  publishedAt?: string;
  artTone: VideoArtTone;
  source: "local" | "remote";
  provider?: "youtube" | "vimeo";
  streamSrc?: string;
  watchUrl?: string;
  thumbnailUrl?: string;
}

export interface VideoChannel {
  id: string;
  name: string;
  initials: string;
  accent: string;
  provider: "youtube" | "vimeo";
}

export interface VideoNowPlaying {
  video: VideoItem;
  progress: number;
  elapsed: string;
  duration: string;
}
