import { useState } from "react";
import { AlbumArt } from "./AlbumArt";
import { broadcastFeedArtSrc, broadcastSongCoverSrc } from "./musicBroadcastCatalog";
import type { MusicImageTone } from "./types";

export interface MusicBroadcastCoverProps {
  songId?: string;
  feedUrl?: string;
  tone: MusicImageTone;
  coverUrl?: string;
  size?: "sm" | "md" | "lg";
  alt: string;
}

export function MusicBroadcastCover({
  songId = "",
  feedUrl,
  tone,
  coverUrl,
  size = "md",
  alt,
}: MusicBroadcastCoverProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [failed, setFailed] = useState(false);

  const primarySrc = songId
    ? broadcastSongCoverSrc(songId)
    : feedUrl
      ? broadcastFeedArtSrc(feedUrl)
      : "";
  const fallbackSrc = coverUrl ?? "";
  const src = useFallback ? fallbackSrc : primarySrc || fallbackSrc;

  if (failed || !src) {
    return <AlbumArt trackId={songId || feedUrl || alt} tone={tone} size={size} alt={alt} />;
  }

  return (
    <img
      className={`arco-music__broadcast-cover arco-music__broadcast-cover--${size}`}
      src={src}
      alt={alt}
      loading="lazy"
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
