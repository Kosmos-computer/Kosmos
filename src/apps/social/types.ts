export type SocialNetworkId = "bluesky" | "mastodon" | "nostr";

export interface SocialNetworkItem {
  id: SocialNetworkId;
  label: string;
  initials: string;
  accent: string;
}

export interface SocialPost {
  id: string;
  authorName: string;
  authorHandle: string;
  verified?: boolean;
  timestamp: string;
  content: string;
  stats: { replies: number; reposts: number; likes: number; views?: number };
}

export interface SocialTrend {
  id: string;
  category: string;
  title: string;
  postCount: string;
}

export interface SocialSuggestion {
  id: string;
  name: string;
  handle: string;
}
