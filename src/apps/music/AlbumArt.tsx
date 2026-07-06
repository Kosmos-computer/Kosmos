import { useState } from "react";
import { musicArtPath } from "@shared/musicSeed";
import type { MusicImageTone } from "./types";

type ArtSize = "sm" | "md" | "lg" | "full";

function fallbackArtClass(tone: MusicImageTone, size: ArtSize) {
  return `arco-music__art arco-music__art--${size} arco-music__art--${tone}`;
}

export interface AlbumArtProps {
  trackId?: string;
  tone: MusicImageTone;
  size?: ArtSize;
  alt?: string;
}

/** Album art from embedded MP3 tags, with gradient fallback when missing. */
export function AlbumArt({ trackId, tone, size = "sm", alt = "" }: AlbumArtProps) {
  const [failed, setFailed] = useState(false);
  const src = trackId && !failed ? musicArtPath(trackId) : undefined;

  if (src) {
    return (
      <img
        className={`arco-music__art arco-music__art--${size} arco-music__art--image`}
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={fallbackArtClass(tone, size)}
      aria-hidden={alt ? undefined : true}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
    />
  );
}
