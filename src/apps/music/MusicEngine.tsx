/**
 * Shell-level audio engine — always mounted on the desktop so playback survives
 * when the Music window is minimized or closed.
 */
import { useEffect, useRef } from "react";
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
    const audio = audioRef.current;
    if (!audio || !previewSrc) return;
    audio.load();
  }, [previewSrc, trackId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !previewSrc) return;

    if (playing) {
      void audio.play().catch(() => stopPlayback());
    } else {
      audio.pause();
    }
  }, [playing, previewSrc, stopPlayback]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

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

    audio.addEventListener("timeupdate", syncProgress);
    audio.addEventListener("loadedmetadata", syncProgress);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", syncProgress);
      audio.removeEventListener("loadedmetadata", syncProgress);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [playNext, setPlaybackProgress]);

  if (!previewSrc) return null;

  return <audio ref={audioRef} src={previewSrc} preload="metadata" aria-hidden="true" />;
}
