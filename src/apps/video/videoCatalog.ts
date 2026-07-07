import { videoStreamPath } from "@shared/mediaPaths";
import type { VideoArtTone, VideoChannel, VideoItem } from "./types";

export interface LocalVideoRecord {
  id: string;
  title: string;
  channel: string;
  durationLabel: string;
  artTone: VideoArtTone;
  available: boolean;
  source: "local";
}

export interface RemoteVideoRecord {
  id: string;
  title: string;
  channel: string;
  durationLabel: string;
  viewCount: string;
  publishedAt: string;
  watchUrl: string;
  thumbnailUrl?: string;
  provider: "youtube" | "vimeo";
  source: "remote";
}

export function localToVideoItem(record: LocalVideoRecord): VideoItem {
  return {
    id: record.id,
    title: record.title,
    channel: record.channel,
    durationLabel: record.durationLabel,
    artTone: record.artTone,
    source: "local",
    streamSrc: videoStreamPath(record.id),
  };
}

export function remoteToVideoItem(record: RemoteVideoRecord): VideoItem {
  return {
    id: record.id,
    title: record.title,
    channel: record.channel,
    durationLabel: record.durationLabel,
    viewCount: record.viewCount,
    publishedAt: record.publishedAt,
    artTone: "rose",
    source: "remote",
    provider: record.provider,
    watchUrl: record.watchUrl,
    thumbnailUrl: record.thumbnailUrl,
  };
}

export function filterVideos(videos: VideoItem[], query: string): VideoItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return videos;
  return videos.filter(
    (video) =>
      video.title.toLowerCase().includes(q) ||
      video.channel.toLowerCase().includes(q),
  );
}

export function groupByChannel(videos: VideoItem[]): Map<string, VideoItem[]> {
  const map = new Map<string, VideoItem[]>();
  for (const video of videos) {
    const list = map.get(video.channel) ?? [];
    list.push(video);
    map.set(video.channel, list);
  }
  return map;
}

export const VIDEO_CHANNELS: VideoChannel[] = [
  { id: "youtube", name: "YouTube", initials: "YT", accent: "#ff0000", provider: "youtube" },
  { id: "vimeo", name: "Vimeo", initials: "Vi", accent: "#1ab7ea", provider: "vimeo" },
];

export function formatVideoTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function parseVideoTime(label: string): number {
  const parts = label.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}
