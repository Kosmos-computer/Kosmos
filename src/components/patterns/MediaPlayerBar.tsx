import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useTranslation } from "react-i18next";
import {
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import type { ReactNode } from "react";
import { MediaProgressScrubber } from "./MediaProgressScrubber";

export interface MediaPlayerBarProps {
  artwork: ReactNode;
  title: string;
  subtitle: string;
  subtitleTag?: ReactNode;
  playing: boolean;
  progress: number;
  elapsed: string;
  duration: string;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (progress: number) => void;
  trackAction?: ReactNode;
  extras?: ReactNode;
  showShuffleRepeat?: boolean;
  showVolume?: boolean;
  /** Continuous live stream — hide seek and skip controls. */
  live?: boolean;
}

export function MediaPlayerBar({
  artwork,
  title,
  subtitle,
  subtitleTag,
  playing,
  progress,
  elapsed,
  duration,
  onTogglePlay,
  onPrevious,
  onNext,
  onSeek,
  trackAction,
  extras,
  showShuffleRepeat = false,
  showVolume = false,
  live = false,
}: MediaPlayerBarProps) {
  const { t } = useTranslation();
  return (
    <footer className="arco-media-player__bar" aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_PLAYBACK_CONTROLS)}>
      <div className="arco-media-player__track">
        {artwork}
        <div className="arco-media-player__track-meta">
          <span className="arco-media-player__track-title">{title}</span>
          <span className="arco-media-player__track-subtitle">{subtitle}</span>
          {subtitleTag}
        </div>
        {trackAction}
      </div>

      <div className="arco-media-player__controls">
        <div className="arco-media-player__control-row">
          {showShuffleRepeat && !live ? (
            <button type="button" className="arco-media-player__control-btn" aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_SHUFFLE)}>
              <Shuffle size={16} />
            </button>
          ) : null}
          {!live ? (
            <button type="button" className="arco-media-player__control-btn" aria-label={i18n.t(I18nKey.COMMON$PREVIOUS)} onClick={onPrevious}>
              <SkipBack size={18} />
            </button>
          ) : null}
          <button
            type="button"
            className="arco-media-player__play-pause-btn"
            aria-label={playing ? "Pause" : "Play"}
            onClick={onTogglePlay}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          {!live ? (
            <button type="button" className="arco-media-player__control-btn" aria-label={i18n.t(I18nKey.COMMON$NEXT)} onClick={onNext}>
              <SkipForward size={18} />
            </button>
          ) : null}
          {showShuffleRepeat && !live ? (
            <button
              type="button"
              className="arco-media-player__control-btn arco-media-player__control-btn--active"
              aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_REPEAT)}
            >
              <Repeat size={16} />
            </button>
          ) : null}
        </div>
        {live ? (
          <div className="arco-media-player__live-status" aria-live="polite">
            <span className="arco-media-player__live-dot" aria-hidden="true" /><T k={I18nKey.COMPONENTS$PATTERNS_LIVE_BROADCAST} /></div>
        ) : (
          <MediaProgressScrubber progress={progress} elapsed={elapsed} duration={duration} onSeek={onSeek} />
        )}
      </div>

      <div className="arco-media-player__extras">
        {extras}
        {showVolume ? (
          <div className="arco-media-player__volume-row">
            <Volume2 size={16} />
            <div className="arco-media-player__volume-track" aria-hidden="true">
              <span className="arco-media-player__volume-fill" />
            </div>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
