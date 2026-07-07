import { useState } from "react";
import { AlbumArt } from "../music/AlbumArt";
import { podcastCoverSrc, podcastFeedArtPath } from "./podcastCatalog";

export interface PodcastCoverProps {
  episodeId?: string;
  feedUrl?: string;
  tone: string;
  coverUrl?: string;
  size?: "sm" | "md" | "lg";
  alt: string;
}

export function PodcastCover({
  episodeId = "",
  feedUrl,
  tone,
  coverUrl,
  size = "md",
  alt,
}: PodcastCoverProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [failed, setFailed] = useState(false);

  const primarySrc = episodeId
    ? podcastCoverSrc(episodeId)
    : feedUrl
      ? podcastFeedArtPath(feedUrl)
      : "";
  const fallbackSrc = coverUrl ?? "";
  const src = useFallback ? fallbackSrc : primarySrc || fallbackSrc;

  if (failed || !src) {
    return <AlbumArt trackId={episodeId || feedUrl || alt} tone={tone as never} size={size} alt={alt} />;
  }

  return (
    <img
      className={`arco-podcast__cover arco-podcast__cover--${size}`}
      src={src}
      alt={alt}
      onError={() => {
        if (!useFallback && fallbackSrc && src !== fallbackSrc) {
          setUseFallback(true);
          return;
        }
        setFailed(true);
      }}
    />
  );
}
