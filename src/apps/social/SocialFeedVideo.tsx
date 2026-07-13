/**
 * Inline social-feed video — progressive MP4/WebM plus HLS (Bluesky playlists).
 * Sizes landscape to the feed width and portrait clips more narrowly.
 */
import { useEffect, useRef, useState } from "react";
import type { SocialEmbedVideo } from "@shared/social";
import Hls from "hls.js";

function isHlsUrl(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url) || url.includes("application/vnd.apple.mpegurl");
}

function canPlayNativeHls(video: HTMLVideoElement): boolean {
  return (
    video.canPlayType("application/vnd.apple.mpegurl") !== "" ||
    video.canPlayType("application/x-mpegURL") !== ""
  );
}

export interface SocialFeedVideoProps {
  video: SocialEmbedVideo;
}

export function SocialFeedVideo({ video }: SocialFeedVideoProps) {
  const src = video.playlist?.trim();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [orientation, setOrientation] = useState<"landscape" | "portrait" | "unknown">("unknown");

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !src) return;

    let hls: Hls | null = null;
    let cancelled = false;

    const attach = () => {
      if (cancelled) return;
      if (isHlsUrl(src)) {
        if (canPlayNativeHls(el)) {
          el.src = src;
          return;
        }
        if (Hls.isSupported()) {
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: 30,
          });
          hls.loadSource(src);
          hls.attachMedia(el);
          return;
        }
      }
      el.src = src;
    };

    attach();

    return () => {
      cancelled = true;
      if (hls) {
        hls.destroy();
        hls = null;
      }
      el.removeAttribute("src");
      el.load();
    };
  }, [src]);

  if (!src) {
    if (!video.thumbnail) return null;
    return (
      <div className="arco-social__video arco-social__video--poster-only">
        <img src={video.thumbnail} alt={video.alt || ""} loading="lazy" />
      </div>
    );
  }

  return (
    <div
      className={`arco-social__video${orientation === "portrait" ? " arco-social__video--portrait" : ""}${orientation === "landscape" ? " arco-social__video--landscape" : ""}`}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <video
        ref={videoRef}
        className="arco-social__video-player"
        controls
        playsInline
        preload="metadata"
        poster={video.thumbnail}
        aria-label={video.alt || "Video"}
        onLoadedMetadata={(event) => {
          const el = event.currentTarget;
          if (!el.videoWidth || !el.videoHeight) return;
          setOrientation(el.videoWidth < el.videoHeight ? "portrait" : "landscape");
        }}
      />
    </div>
  );
}
