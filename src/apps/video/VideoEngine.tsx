/**
 * Shell-level video engine — syncs store playback state with the active player.
 */
import { useEffect } from "react";
import { formatVideoTime } from "./videoCatalog";
import { registerVideoSeekHandler, useVideoStore } from "./videoStore";

export function VideoEngine() {
  const init = useVideoStore((s) => s.init);
  const streamSrc = useVideoStore((s) => s.nowPlaying.video.streamSrc);
  const videoId = useVideoStore((s) => s.nowPlaying.video.id);
  const playing = useVideoStore((s) => s.playing);
  const stopPlayback = useVideoStore((s) => s.stopPlayback);
  const setPlaybackProgress = useVideoStore((s) => s.setPlaybackProgress);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    registerVideoSeekHandler((progress) => {
      const video = document.querySelector<HTMLVideoElement>(".arco-video__player");
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
      video.currentTime = (progress / 100) * video.duration;
      setPlaybackProgress(progress, formatVideoTime(video.currentTime), formatVideoTime(video.duration));
    });
    return () => registerVideoSeekHandler(null);
  }, [setPlaybackProgress]);

  useEffect(() => {
    const video = document.querySelector<HTMLVideoElement>(".arco-video__player");
    if (!video || !streamSrc) return;

    if (!playing) {
      video.pause();
      return;
    }

    const start = () => {
      void video.play().catch(() => stopPlayback());
    };

    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      start();
    } else {
      video.addEventListener("canplay", start, { once: true });
      return () => video.removeEventListener("canplay", start);
    }
  }, [playing, streamSrc, videoId, stopPlayback]);

  useEffect(() => {
    const video = document.querySelector<HTMLVideoElement>(".arco-video__player");
    if (!video || !streamSrc) return;

    const syncProgress = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      setPlaybackProgress(
        (video.currentTime / video.duration) * 100,
        formatVideoTime(video.currentTime),
        formatVideoTime(video.duration),
      );
    };

    video.addEventListener("timeupdate", syncProgress);
    video.addEventListener("loadedmetadata", syncProgress);
    return () => {
      video.removeEventListener("timeupdate", syncProgress);
      video.removeEventListener("loadedmetadata", syncProgress);
    };
  }, [streamSrc, videoId, setPlaybackProgress]);

  return null;
}
