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
