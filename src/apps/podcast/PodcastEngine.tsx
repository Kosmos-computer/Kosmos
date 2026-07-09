/**
 * Shell-level audio engine for podcasts and audiobooks.
 */
import { useEffect, useRef } from "react";
import { formatPodcastTime } from "./podcastCatalog";
import { registerPodcastSeekHandler, usePodcastStore } from "./podcastStore";

function shouldBePlaying(): boolean {
  return usePodcastStore.getState().playing;
}

export function PodcastEngine() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const init = usePodcastStore((s) => s.init);
  const streamSrc = usePodcastStore((s) => s.nowPlaying.episode.streamSrc);
  const episodeId = usePodcastStore((s) => s.nowPlaying.episode.id);
  const playing = usePodcastStore((s) => s.playing);
  const stopPlayback = usePodcastStore((s) => s.stopPlayback);
  const setPlaybackProgress = usePodcastStore((s) => s.setPlaybackProgress);
  const playNext = usePodcastStore((s) => s.playNext);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    registerPodcastSeekHandler((progress) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
      audio.currentTime = (progress / 100) * audio.duration;
      setPlaybackProgress(progress, formatPodcastTime(audio.currentTime), formatPodcastTime(audio.duration));
    });
    return () => registerPodcastSeekHandler(null);
  }, [setPlaybackProgress]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !streamSrc) return;
    audio.pause();
    audio.currentTime = 0;
    audio.load();
  }, [streamSrc, episodeId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !streamSrc) return;

    if (!playing) {
      audio.pause();
      return;
    }

    const tryPlay = () => {
      if (!shouldBePlaying()) return;
      const playPromise = audio.play();
      if (playPromise === undefined) return;
      void playPromise
        .then(() => {
          if (!shouldBePlaying()) audio.pause();
        })
        .catch(() => stopPlayback());
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      tryPlay();
      return;
    }

    const onCanPlay = () => tryPlay();
    audio.addEventListener("canplay", onCanPlay, { once: true });
    return () => audio.removeEventListener("canplay", onCanPlay);
  }, [playing, streamSrc, episodeId, stopPlayback]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !streamSrc) return;

    const syncProgress = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      setPlaybackProgress(
        (audio.currentTime / audio.duration) * 100,
        formatPodcastTime(audio.currentTime),
        formatPodcastTime(audio.duration),
      );
    };

    const handleEnded = () => playNext();
    const handleError = () => stopPlayback();

    audio.addEventListener("timeupdate", syncProgress);
    audio.addEventListener("loadedmetadata", syncProgress);
    audio.addEventListener("durationchange", syncProgress);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    return () => {
      audio.removeEventListener("timeupdate", syncProgress);
      audio.removeEventListener("loadedmetadata", syncProgress);
      audio.removeEventListener("durationchange", syncProgress);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [streamSrc, episodeId, playNext, setPlaybackProgress, stopPlayback]);

  if (!streamSrc) return null;

  return <audio ref={audioRef} src={streamSrc} preload={playing ? "auto" : "metadata"} aria-hidden="true" />;
}
