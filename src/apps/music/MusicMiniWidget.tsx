/**
 * Floating mini player — shown when the Music window is minimized or the user
 * pops out playback to keep listening while using other apps.
 */
import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Pause,
  Play,
  SkipForward,
  X,
} from "lucide-react";
import { useMusicStore } from "./musicStore";
import type { MusicImageTone } from "./types";

function artClass(tone: MusicImageTone) {
  return `arco-music__art arco-music__art--sm arco-music__art--${tone}`;
}

export function MusicMiniWidget() {
  const widgetVisible = useMusicStore((s) => s.widgetVisible);
  const widgetCollapsed = useMusicStore((s) => s.widgetCollapsed);
  const widgetPosition = useMusicStore((s) => s.widgetPosition);
  const nowPlaying = useMusicStore((s) => s.nowPlaying);
  const playing = useMusicStore((s) => s.playing);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const playNext = useMusicStore((s) => s.playNext);
  const hideWidget = useMusicStore((s) => s.hideWidget);
  const toggleWidgetCollapsed = useMusicStore((s) => s.toggleWidgetCollapsed);
  const setWidgetPosition = useMusicStore((s) => s.setWidgetPosition);
  const restoreMusicWindow = useMusicStore((s) => s.restoreMusicWindow);

  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null,
  );

  const onDragPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
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
        <span className={artClass(track.albumArtTone)} aria-hidden="true" />

        <div className="arco-music-widget__meta">
          <span className="arco-music-widget__title">{track.title}</span>
          <span className="arco-music-widget__artist">{track.artists}</span>
          {!widgetCollapsed ? (
            <div className="arco-music-widget__progress" aria-hidden="true">
              <span className="arco-music-widget__progress-fill" style={{ width: `${progress}%` }} />
            </div>
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
          {!widgetCollapsed ? (
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
          <span className="arco-music-widget__time">{elapsed}</span>
          <span className="arco-music-widget__time">{track.duration}</span>
        </div>
      ) : null}
    </div>
  );
}
