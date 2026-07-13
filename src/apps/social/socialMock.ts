import type { SocialNetworkItem, SocialPost } from "./types";

export const SOCIAL_NETWORKS: SocialNetworkItem[] = [
  { id: "bluesky", label: "Bluesky", initials: "BS", accent: "#0085ff" },
  { id: "mastodon", label: "Mastodon", initials: "Ma", accent: "#6364ff" },
  { id: "nostr", label: "Nostr", initials: "No", accent: "#8b5cf6" },
  { id: "twitter", label: "X", initials: "X", accent: "#000000" },
  { id: "facebook", label: "Facebook", initials: "Fb", accent: "#1877f2" },
];

export const SOCIAL_POSTS: SocialPost[] = [
  {
    id: "post-1",
    authorName: "Casey Walsh",
    authorHandle: "@caseywalsh",
    verified: true,
    timestamp: "16h",
    content:
      "Re-read an old essay on community gardens this morning. Still one of the best reminders that small shared projects compound over time.",
    stats: { replies: 42, reposts: 318, likes: 2400, views: 89000 },
  },
  {
    id: "post-2",
    authorName: "Harbor Analytics",
    authorHandle: "@harboranalytics",
    timestamp: "7h",
    content:
      "June volunteer sign-ups are live — shift coverage, RSVP trends, and supply needs in one dashboard.",
    stats: { replies: 18, reposts: 64, likes: 412, views: 12400 },
  },
  {
    id: "post-3",
    authorName: "Riley Chen",
    authorHandle: "@rileychen",
    timestamp: "2h",
    content: "Shipped the new onboarding flow for community volunteers. Feedback welcome.",
    stats: { replies: 9, reposts: 21, likes: 186, views: 4200 },
  },
];

export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(value);
}
