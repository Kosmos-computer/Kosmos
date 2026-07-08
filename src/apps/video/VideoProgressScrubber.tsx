import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { formatVideoTime, parseVideoTime } from "./videoCatalog";

export interface VideoProgressScrubberProps {
  progress: number;
  elapsed: string;
  duration: string;
  onSeek: (progress: number) => void;
  onScrubPreview?: (progress: number | null) => void;
  variant?: "player" | "inline";
  showTimes?: boolean;
  className?: string;
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function VideoProgressScrubber({
  progress,
  elapsed,
  duration,
  onSeek,
  onScrubPreview,
  variant = "player",
  showTimes = variant === "player",
  className = "",
}: VideoProgressScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubProgress, setScrubProgress] = useState<number | null>(null);

  const displayProgress = scrubProgress ?? progress;
  const durationSeconds = parseVideoTime(duration);
  const previewElapsed =
    scrubProgress != null && durationSeconds > 0
      ? formatVideoTime((scrubProgress / 100) * durationSeconds)
      : elapsed;

  const progressFromClientX = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const { left, width } = track.getBoundingClientRect();
    if (width <= 0) return 0;
    return clampProgress(((clientX - left) / width) * 100);
  }, []);

  const updateScrub = useCallback(
    (next: number) => {
      setScrubProgress(next);
      onScrubPreview?.(next);
    },
    [onScrubPreview],
  );

  const clearScrub = useCallback(() => {
    setScrubbing(false);
    setScrubProgress(null);
    onScrubPreview?.(null);
  }, [onScrubPreview]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const next = progressFromClientX(event.clientX);
    setScrubbing(true);
    updateScrub(next);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!scrubbing) return;
    updateScrub(progressFromClientX(event.clientX));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!scrubbing) return;
    const next = progressFromClientX(event.clientX);
    clearScrub();
    onSeek(next);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onPointerCancel = () => {
    if (!scrubbing) return;
    clearScrub();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 5;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onSeek(clampProgress(progress - step));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onSeek(clampProgress(progress + step));
    } else if (event.key === "Home") {
      event.preventDefault();
      onSeek(0);
    } else if (event.key === "End") {
      event.preventDefault();
      onSeek(100);
    }
  };

  const trackClassName = [
    variant === "inline" ? "arco-video__inline-progress" : "arco-video__progress-track",
    scrubbing ? "arco-video__progress-track--scrubbing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const fillClassName =
    variant === "inline" ? "arco-video__inline-progress-fill" : "arco-video__progress-fill";

  const scrubber = (
    <div
      ref={trackRef}
      className={trackClassName}
      role="slider"
      tabIndex={0}
      aria-label={i18n.t(I18nKey.APPS$MUSIC_SEEK)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(displayProgress)}
      aria-valuetext={`${previewElapsed} of ${duration}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
    >
      <span className={fillClassName} style={{ width: `${displayProgress}%` }} />
      {variant === "player" ? (
        <span className="arco-video__progress-thumb" style={{ left: `${displayProgress}%` }} />
      ) : null}
    </div>
  );

  if (!showTimes) {
    return <div className={className}>{scrubber}</div>;
  }

  return (
    <div className={["arco-video__progress-row", className].filter(Boolean).join(" ")}>
      <span className="arco-video__time-label">{previewElapsed}</span>
      {scrubber}
      <span className="arco-video__time-label">{duration}</span>
    </div>
  );
}
