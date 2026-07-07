/** Shared stream/thumbnail path helpers for local media apps. */

export function videoStreamPath(videoId: string): string {
  return `/api/video/stream/${encodeURIComponent(videoId)}`;
}

export function videoThumbnailPath(videoId: string): string {
  return `/api/video/thumbnail/${encodeURIComponent(videoId)}`;
}

export function podcastStreamPath(episodeId: string): string {
  return `/api/podcast/stream/${encodeURIComponent(episodeId)}`;
}

export function podcastArtPath(episodeId: string): string {
  return `/api/podcast/art/${encodeURIComponent(episodeId)}`;
}

export function podcastFeedArtPath(feedUrl: string): string {
  return `/api/podcast/rss/feed-art?url=${encodeURIComponent(feedUrl)}`;
}

export function musicRssStreamPath(songId: string, feedUrl?: string): string {
  const base = `/api/music/rss/stream/${encodeURIComponent(songId)}`;
  if (!feedUrl) return base;
  return `${base}?feedUrl=${encodeURIComponent(feedUrl)}`;
}

export function musicRssArtPath(songId: string): string {
  return `/api/music/rss/art/${encodeURIComponent(songId)}`;
}

export function musicRssFeedArtPath(feedUrl: string): string {
  return `/api/music/rss/feed-art?url=${encodeURIComponent(feedUrl)}`;
}

export function musicLiveStreamPath(stationId: string): string {
  return `/api/music/live/stream/${encodeURIComponent(stationId)}`;
}
