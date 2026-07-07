/**
 * Shell-level audio engine — always mounted on the desktop so playback survives
 * when the Music window is minimized or closed.
 */
import { useEffect, useRef } from "react";
import { registerMusicSeekHandler } from "./musicAudio";
import { formatMusicTime, useMusicStore } from "./musicStore";

export function MusicEngine() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const init = useMusicStore((s) => s.init);
  const previewSrc = useMusicStore((s) => s.nowPlaying.track.previewSrc);
  const trackId = useMusicStore((s) => s.nowPlaying.track.id);
  const playing = useMusicStore((s) => s.playing);
  const stopPlayback = useMusicStore((s) => s.stopPlayback);
  const setPlaybackProgress = useMusicStore((s) => s.setPlaybackProgress);
  const playNext = useMusicStore((s) => s.playNext);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    registerMusicSeekHandler((progress) => {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
      audio.currentTime = (progress / 100) * audio.duration;
      setPlaybackProgress(
        progress,
        formatMusicTime(audio.currentTime),
        formatMusicTime(audio.duration),
      );
    });

    return () => registerMusicSeekHandler(null);
  }, [setPlaybackProgress]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !previewSrc) return;
    audio.load();
  }, [previewSrc, trackId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !previewSrc) return;

    if (!playing) {
      audio.pause();
      return;
    }

    const start = () => {
      void audio.play().catch(() => stopPlayback());
    };

    // Metadata can arrive after the first play attempt — retry once the track is ready.
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      start();
    } else {
      audio.addEventListener("canplay", start, { once: true });
      return () => audio.removeEventListener("canplay", start);
    }
  }, [playing, previewSrc, trackId, stopPlayback]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !previewSrc) return;

    const syncProgress = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      setPlaybackProgress(
        (audio.currentTime / audio.duration) * 100,
        formatMusicTime(audio.currentTime),
        formatMusicTime(audio.duration),
      );
    };

    const handleEnded = () => {
      playNext();
    };

    const handleError = () => {
      stopPlayback();
    };

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
  }, [previewSrc, trackId, playNext, setPlaybackProgress, stopPlayback]);

  if (!previewSrc) return null;

  return <audio ref={audioRef} src={previewSrc} preload="metadata" aria-hidden="true" />;
}
