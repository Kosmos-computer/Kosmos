/**
 * Stub remote media catalogs — returns provider-shaped items when a token is present.
 * OAuth and live API calls replace this in a later phase.
 */
import type { PodcastProviderId, VideoProviderId } from "../../shared/serviceConnections.js";

export type MediaSource = "local" | "remote";

export interface RemoteVideoItem {
  id: string;
  title: string;
  channel: string;
  durationLabel: string;
  viewCount: string;
  publishedAt: string;
  thumbnailUrl?: string;
  watchUrl: string;
  provider: VideoProviderId;
  source: "remote";
}

export interface RemotePodcastItem {
  id: string;
  title: string;
  showTitle: string;
  host: string;
  durationLabel: string;
  publishedAt: string;
  kind: "podcast" | "audiobook";
  coverUrl?: string;
  listenUrl: string;
  provider: PodcastProviderId;
  source: "remote";
}

function requireToken(token: string | undefined): boolean {
  return Boolean(token && token.trim().length >= 8);
}

export function listRemoteVideos(input: {
  provider: VideoProviderId;
  token?: string;
  query?: string;
}): RemoteVideoItem[] {
  if (!requireToken(input.token)) return [];

  const q = input.query?.trim() || "featured";
  const base = input.provider === "youtube" ? "https://www.youtube.com/watch?v=" : "https://vimeo.com/";

  return [
    {
      id: `${input.provider}-remote-1`,
      title: `${q} — studio walkthrough`,
      channel: input.provider === "youtube" ? "Arco Creators" : "Arco Studio",
      durationLabel: "18:42",
      viewCount: "12K views",
      publishedAt: "2 days ago",
      watchUrl: `${base}${input.provider === "youtube" ? "dQw4w9WgXcQ" : "76979871"}`,
      provider: input.provider,
      source: "remote",
    },
    {
      id: `${input.provider}-remote-2`,
      title: "Design systems in the open",
      channel: "Open Standards",
      durationLabel: "32:10",
      viewCount: "48K views",
      publishedAt: "1 week ago",
      watchUrl: `${base}${input.provider === "youtube" ? "abc123def45" : "148751763"}`,
      provider: input.provider,
      source: "remote",
    },
    {
      id: `${input.provider}-remote-3`,
      title: "Local-first media libraries",
      channel: "Arco Labs",
      durationLabel: "24:05",
      viewCount: "3.2K views",
      publishedAt: "3 weeks ago",
      watchUrl: `${base}${input.provider === "youtube" ? "xyz789ghi01" : "224392134"}`,
      provider: input.provider,
      source: "remote",
    },
  ];
}

export function listRemotePodcastEpisodes(input: {
  provider: PodcastProviderId;
  token?: string;
  query?: string;
  kind?: "podcast" | "audiobook" | "all";
}): RemotePodcastItem[] {
  if (!requireToken(input.token)) return [];

  const q = input.query?.trim() || "recommended";
  const listenBase =
    input.provider === "spotify"
      ? "https://open.spotify.com/episode/"
      : input.provider === "apple-podcasts"
        ? "https://podcasts.apple.com/us/podcast/id"
        : "https://www.audible.com/pd/";

  const items: RemotePodcastItem[] = [
    {
      id: `${input.provider}-pod-1`,
      title: `${q} — weekly briefing`,
      showTitle: "Arco Dispatch",
      host: "Arco Team",
      durationLabel: "42:18",
      publishedAt: "Yesterday",
      kind: "podcast",
      listenUrl: `${listenBase}${input.provider}-ep-1`,
      provider: input.provider,
      source: "remote",
    },
    {
      id: `${input.provider}-pod-2`,
      title: "The future of personal computing",
      showTitle: "Platform Shift",
      host: "Mira Chen",
      durationLabel: "55:02",
      publishedAt: "4 days ago",
      kind: "podcast",
      listenUrl: `${listenBase}${input.provider}-ep-2`,
      provider: input.provider,
      source: "remote",
    },
    {
      id: `${input.provider}-book-1`,
      title: "Chapter 3 — The shell awakens",
      showTitle: "Local First",
      host: "Alex Rivera",
      durationLabel: "38:44",
      publishedAt: "In progress",
      kind: "audiobook",
      listenUrl: `${listenBase}${input.provider}-book-1`,
      provider: input.provider,
      source: "remote",
    },
  ];

  if (input.kind && input.kind !== "all") {
    return items.filter((item) => item.kind === input.kind);
  }
  return items;
}
