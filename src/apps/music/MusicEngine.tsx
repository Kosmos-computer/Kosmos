/**
 * Shell-level audio engine — always mounted on the desktop so playback survives
 * when the Music window is minimized or closed.
 */
import { useEffect, useRef } from "react";
import { onAppEvent } from "../../os/appEventBus";
import { registerMusicSeekHandler } from "./musicAudio";
import { formatMusicTime, useMusicStore } from "./musicStore";

function shouldBePlaying(): boolean {
  return useMusicStore.getState().playing;
}

export function MusicEngine() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const init = useMusicStore((s) => s.init);
  const refreshLibrary = useMusicStore((s) => s.refreshLibrary);
  const previewSrc = useMusicStore((s) => s.nowPlaying.track.previewSrc);
  const trackId = useMusicStore((s) => s.nowPlaying.track.id);
  const playing = useMusicStore((s) => s.playing);
  const isLive = useMusicStore((s) => s.nowPlaying.track.live);
  const stopPlayback = useMusicStore((s) => s.stopPlayback);
  const setPlaybackProgress = useMusicStore((s) => s.setPlaybackProgress);
  const playNext = useMusicStore((s) => s.playNext);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    return onAppEvent((detail) => {
      if (detail.topic === "music.changed") {
        void refreshLibrary();
      }
    });
  }, [refreshLibrary]);

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
    audio.pause();
    audio.currentTime = 0;
    audio.load();
  }, [previewSrc, trackId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !previewSrc) return;

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
  }, [playing, previewSrc, trackId, stopPlayback]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !previewSrc) return;

    const syncProgress = () => {
      if (isLive) return;
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      setPlaybackProgress(
        (audio.currentTime / audio.duration) * 100,
        formatMusicTime(audio.currentTime),
        formatMusicTime(audio.duration),
      );
    };

    const handleEnded = () => {
      if (isLive) return;
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
  }, [previewSrc, trackId, playNext, setPlaybackProgress, stopPlayback, isLive]);

  if (!previewSrc) return null;

  return <audio ref={audioRef} src={previewSrc} preload={playing ? "auto" : "metadata"} aria-hidden="true" />;
}
