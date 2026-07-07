/**
 * Floating mini player — shown when the Music window is minimized or the user
 * pops out playback to keep listening while using other apps.
 */
import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Pause,
  Play,
  SkipForward,
  X,
} from "lucide-react";
import { AlbumArt } from "./AlbumArt";
import { MusicBroadcastCover } from "./MusicBroadcastCover";
import { MusicProgressScrubber } from "./MusicProgressScrubber";
import { formatMusicTime, parseMusicTime, useMusicStore } from "./musicStore";

export function MusicMiniWidget() {
  const widgetVisible = useMusicStore((s) => s.widgetVisible);
  const widgetCollapsed = useMusicStore((s) => s.widgetCollapsed);
  const widgetPosition = useMusicStore((s) => s.widgetPosition);
  const nowPlaying = useMusicStore((s) => s.nowPlaying);
  const playing = useMusicStore((s) => s.playing);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const playNext = useMusicStore((s) => s.playNext);
  const seekPlayback = useMusicStore((s) => s.seekPlayback);
  const hideWidget = useMusicStore((s) => s.hideWidget);
  const toggleWidgetCollapsed = useMusicStore((s) => s.toggleWidgetCollapsed);
  const setWidgetPosition = useMusicStore((s) => s.setWidgetPosition);
  const restoreMusicWindow = useMusicStore((s) => s.restoreMusicWindow);

  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null,
  );
  const [scrubPreview, setScrubPreview] = useState<number | null>(null);

  const onDragPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if ((e.target as HTMLElement).closest("button, [role='slider']")) return;
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: widgetPosition.x,
        origY: widgetPosition.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [widgetPosition.x, widgetPosition.y],
  );

  const onDragPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const drag = dragState.current;
      if (!drag) return;
      const x = Math.max(8, drag.origX + (e.clientX - drag.startX));
      const y = Math.max(42, drag.origY + (e.clientY - drag.startY));
      setWidgetPosition({ x, y });
    },
    [setWidgetPosition],
  );

  const onDragPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  if (!widgetVisible) return null;

  const { track, progress, elapsed } = nowPlaying;
  const durationSeconds = parseMusicTime(track.duration);
  const displayElapsed =
    scrubPreview != null && durationSeconds > 0
      ? formatMusicTime((scrubPreview / 100) * durationSeconds)
      : elapsed;

  return (
    <div
      className={[
        "arco-music-widget",
        widgetCollapsed && "arco-music-widget--collapsed",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ left: widgetPosition.x, top: widgetPosition.y }}
      role="region"
      aria-label="Music mini player"
    >
      <div
        className="arco-music-widget__drag-handle"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
      >
        {track.source === "rss" ? (
          <MusicBroadcastCover songId={track.id} tone={track.albumArtTone} size="sm" alt={track.title} />
        ) : (
          <AlbumArt
            trackId={track.source === "live" ? undefined : track.id !== "empty" ? track.id : undefined}
            tone={track.albumArtTone}
            size="sm"
            alt={track.title}
          />
        )}

        <div className="arco-music-widget__meta">
          <span className="arco-music-widget__title">{track.title}</span>
          <span className="arco-music-widget__artist">{track.artists}</span>
          {!widgetCollapsed && !track.live ? (
            <MusicProgressScrubber
              progress={progress}
              elapsed={elapsed}
              duration={track.duration}
              onSeek={seekPlayback}
              onScrubPreview={setScrubPreview}
              variant="widget"
              showTimes={false}
            />
          ) : !widgetCollapsed && track.live ? (
            <span className="arco-music-widget__live">Live broadcast</span>
          ) : null}
        </div>

        <div className="arco-music-widget__controls">
          <button
            type="button"
            className="arco-music-widget__btn arco-music-widget__btn--play"
            aria-label={playing ? "Pause" : "Play"}
            onClick={togglePlay}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          {!widgetCollapsed && !track.live ? (
            <button
              type="button"
              className="arco-music-widget__btn"
              aria-label="Next track"
              onClick={playNext}
            >
              <SkipForward size={15} />
            </button>
          ) : null}
          <button
            type="button"
            className="arco-music-widget__btn"
            aria-label={widgetCollapsed ? "Expand mini player" : "Collapse mini player"}
            onClick={toggleWidgetCollapsed}
          >
            {widgetCollapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button
            type="button"
            className="arco-music-widget__btn"
            aria-label="Open Music app"
            onClick={restoreMusicWindow}
          >
            <Maximize2 size={14} />
          </button>
          <button
            type="button"
            className="arco-music-widget__btn arco-music-widget__btn--close"
            aria-label="Close mini player"
            onClick={hideWidget}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!widgetCollapsed ? (
        <div className="arco-music-widget__footer">
          <span className="arco-music-widget__time">{track.live ? "Live" : displayElapsed}</span>
          <span className="arco-music-widget__time">{track.live ? "" : track.duration}</span>
        </div>
      ) : null}
    </div>
  );
}
