import { useState } from "react";
import { AlbumArt } from "../music/AlbumArt";
import { podcastCoverSrc } from "./podcastCatalog";

export interface PodcastCoverProps {
  episodeId: string;
  tone: string;
  coverUrl?: string;
  size?: "sm" | "md" | "lg";
  alt: string;
}

export function PodcastCover({ episodeId, tone, coverUrl, size = "md", alt }: PodcastCoverProps) {
  const [failed, setFailed] = useState(false);
  const src = episodeId ? podcastCoverSrc(episodeId) : (coverUrl ?? "");

  if (failed || !episodeId) {
    return <AlbumArt trackId={episodeId} tone={tone as never} size={size} alt={alt} />;
  }

  return (
    <img
      className={`arco-podcast__cover arco-podcast__cover--${size}`}
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}
