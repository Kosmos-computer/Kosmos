/**
 * Remote media catalogs. Video is wired to live APIs (YouTube Data API v3,
 * Vimeo API) using the token pasted into the Connect modal as the credential
 * (a YouTube API key or a Vimeo personal access token, respectively).
 * Podcast remote catalogs are still a stub — OAuth/live calls come later.
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

function formatViewCount(count: number | undefined): string {
  if (!count || !Number.isFinite(count)) return "";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K views`;
  return `${count} views`;
}

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.max(0, (Date.now() - then) / 1000);
  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  let value = seconds;
  for (const [size, label] of units) {
    if (value < size) {
      const n = Math.max(1, Math.floor(value));
      return `${n} ${label}${n === 1 ? "" : "s"} ago`;
    }
    value /= size;
  }
  return "";
}

/** Parses an ISO 8601 duration (e.g. "PT18M42S") into "H:MM:SS" or "M:SS". */
function formatIso8601Duration(iso: string | undefined): string {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? "");
  if (!match) return "0:00";
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatSecondsDuration(totalSeconds: number | undefined): string {
  if (!totalSeconds || !Number.isFinite(totalSeconds)) return "0:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const mm = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes);
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
  };
}

interface YouTubeVideoItem {
  id?: string;
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string };
}

async function listYouTubeVideos(apiKey: string, query: string): Promise<RemoteVideoItem[]> {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", "12");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("key", apiKey);

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`YouTube search failed (${searchRes.status})`);
  const searchBody = (await searchRes.json()) as { items?: YouTubeSearchItem[] };
  const items = (searchBody.items ?? []).filter((item) => item.id?.videoId);
  if (items.length === 0) return [];

  const ids = items.map((item) => item.id!.videoId).join(",");
  const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  detailsUrl.searchParams.set("part", "contentDetails,statistics");
  detailsUrl.searchParams.set("id", ids);
  detailsUrl.searchParams.set("key", apiKey);

  const detailsRes = await fetch(detailsUrl);
  const detailsBody = detailsRes.ok
    ? ((await detailsRes.json()) as { items?: YouTubeVideoItem[] })
    : { items: [] };
  const detailsById = new Map((detailsBody.items ?? []).map((item) => [item.id, item]));

  return items.map((item) => {
    const videoId = item.id!.videoId!;
    const details = detailsById.get(videoId);
    const thumb = item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url;
    return {
      id: `youtube-${videoId}`,
      title: item.snippet?.title ?? "Untitled",
      channel: item.snippet?.channelTitle ?? "YouTube",
      durationLabel: formatIso8601Duration(details?.contentDetails?.duration),
      viewCount: formatViewCount(Number(details?.statistics?.viewCount)),
      publishedAt: formatRelativeTime(item.snippet?.publishedAt),
      thumbnailUrl: thumb,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      provider: "youtube",
      source: "remote",
    };
  });
}

interface VimeoVideoItem {
  uri?: string;
  name?: string;
  duration?: number;
  release_time?: string;
  created_time?: string;
  link?: string;
  stats?: { plays?: number };
  pictures?: { sizes?: { link?: string }[] };
  user?: { name?: string };
}

async function listVimeoVideos(accessToken: string, query: string): Promise<RemoteVideoItem[]> {
  const url = new URL("https://api.vimeo.com/videos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "12");
  url.searchParams.set(
    "fields",
    "uri,name,duration,release_time,created_time,link,stats.plays,pictures.sizes,user.name",
  );

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
  });
  if (!res.ok) throw new Error(`Vimeo search failed (${res.status})`);
  const body = (await res.json()) as { data?: VimeoVideoItem[] };

  return (body.data ?? [])
    .filter((item) => item.uri)
    .map((item) => {
      const videoId = item.uri!.split("/").pop() ?? "";
      const sizes = item.pictures?.sizes ?? [];
      return {
        id: `vimeo-${videoId}`,
        title: item.name ?? "Untitled",
        channel: item.user?.name ?? "Vimeo",
        durationLabel: formatSecondsDuration(item.duration),
        viewCount: formatViewCount(item.stats?.plays),
        publishedAt: formatRelativeTime(item.release_time ?? item.created_time),
        thumbnailUrl: sizes[sizes.length - 1]?.link,
        watchUrl: item.link ?? `https://vimeo.com/${videoId}`,
        provider: "vimeo",
        source: "remote",
      };
    });
}

export async function listRemoteVideos(input: {
  provider: VideoProviderId;
  token?: string;
  query?: string;
}): Promise<RemoteVideoItem[]> {
  if (!requireToken(input.token)) return [];
  const query = input.query?.trim() || "featured";

  try {
    return input.provider === "youtube"
      ? await listYouTubeVideos(input.token!.trim(), query)
      : await listVimeoVideos(input.token!.trim(), query);
  } catch (err) {
    console.error(`[mediaRemoteService] ${input.provider} lookup failed:`, err);
    return [];
  }
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
