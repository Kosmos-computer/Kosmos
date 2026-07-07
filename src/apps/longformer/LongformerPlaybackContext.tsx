import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { mediaUrlForJob } from "./artifactContent";
import type { LongformerViewModel } from "./longformerStore";
import type { TranscriptDetail } from "./types";

interface PlaybackContextValue {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  mediaUrl: string | null;
  seekTo: (ms: number) => void;
  togglePlayback: () => void;
}

const LongformerPlaybackContext = createContext<PlaybackContextValue | null>(null);

export function useLongformerPlayback(): PlaybackContextValue {
  const ctx = useContext(LongformerPlaybackContext);
  if (!ctx) throw new Error("useLongformerPlayback must be used within LongformerPlaybackProvider");
  return ctx;
}

interface LongformerPlaybackProviderProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
  children: ReactNode;
}

/** Syncs HTML audio element with transcript playhead state. */
export function LongformerPlaybackProvider({ vm, detail, children }: LongformerPlaybackProviderProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaUrl = useMemo(() => mediaUrlForJob(vm.selectedTranscriptId), [vm.selectedTranscriptId]);
  const seekingRef = useRef(false);

  const seekTo = useCallback(
    (ms: number) => {
      const clamped = Math.max(0, Math.min(ms, detail.durationMs));
      seekingRef.current = true;
      const audio = audioRef.current;
      if (audio && mediaUrl) {
        audio.currentTime = clamped / 1000;
      }
      vm.setCurrentMs(clamped);
      window.setTimeout(() => {
        seekingRef.current = false;
      }, 100);
    },
    [detail.durationMs, mediaUrl, vm],
  );

  const togglePlayback = useCallback(() => {
    vm.togglePlayback();
  }, [vm]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !mediaUrl) return;

    if (vm.isPlaying) {
      void audio.play().catch(() => {
        if (vm.isPlaying) vm.togglePlayback();
      });
    } else {
      audio.pause();
    }
  }, [vm.isPlaying, mediaUrl, vm]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !mediaUrl) return;

    const onTimeUpdate = () => {
      if (seekingRef.current) return;
      vm.setCurrentMs(audio.currentTime * 1000);
    };

    const onEnded = () => {
      if (vm.isPlaying) vm.togglePlayback();
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [mediaUrl, vm]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !mediaUrl || seekingRef.current) return;
    const target = detail.currentMs / 1000;
    if (Math.abs(audio.currentTime - target) > 0.3) {
      audio.currentTime = target;
    }
  }, [detail.currentMs, mediaUrl]);

  const value = useMemo(
    () => ({ audioRef, mediaUrl, seekTo, togglePlayback }),
    [mediaUrl, seekTo, togglePlayback],
  );

  return (
    <LongformerPlaybackContext.Provider value={value}>
      {mediaUrl ? <audio ref={audioRef} src={mediaUrl} preload="metadata" className="arco-longformer-audio" /> : null}
      {children}
    </LongformerPlaybackContext.Provider>
  );
}
