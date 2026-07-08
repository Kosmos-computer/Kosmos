import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { Pause, Play, SkipForward } from "lucide-react";
import { AlbumArt } from "../../apps/music/AlbumArt";
import { useMusicStore } from "../../apps/music/musicStore";

/** Live now-playing card for the bento drawer — reads from the global music store. */
export function BentoMusicWidget() {
  const nowPlaying = useMusicStore((s) => s.nowPlaying);
  const playing = useMusicStore((s) => s.playing);
  const loading = useMusicStore((s) => s.loading);
  const togglePlay = useMusicStore((s) => s.togglePlay);
  const playNext = useMusicStore((s) => s.playNext);
  const restoreMusicWindow = useMusicStore((s) => s.restoreMusicWindow);

  const { track, progress } = nowPlaying;

  if (loading) {
    return (
      <div className="arco-bento-card arco-bento-card--music">
        <span className="arco-bento-card__label"><T k={I18nKey.OS_BENTO_NOW_PLAYING} /></span>
        <span className="arco-bento-card__meta"><T k={I18nKey.OS_BENTO_LOADING_LIBRARY} /></span>
      </div>
    );
  }

  return (
    <div className="arco-bento-card arco-bento-card--music">
      <span className="arco-bento-card__label"><T k={I18nKey.OS_BENTO_NOW_PLAYING} /></span>
      <div className="arco-bento-card--music__row">
        <AlbumArt
          trackId={track.id !== "empty" ? track.id : undefined}
          tone={track.albumArtTone}
          size="sm"
          alt={track.title}
        />
        <div className="arco-music-widget__meta">
          <span className="arco-music-widget__title">{track.title}</span>
          <span className="arco-music-widget__artist">{track.artists}</span>
          <div className="arco-music-widget__progress" aria-hidden="true">
            <span className="arco-music-widget__progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <div className="arco-bento-card__music-controls">
        <button
          type="button"
          className="arco-bento-card__music-play"
          aria-label={playing ? "Pause" : "Play"}
          onClick={togglePlay}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          type="button"
          className="arco-music-widget__btn"
          aria-label={i18n.t(I18nKey.APPS$MUSIC_NEXT_TRACK)}
          onClick={playNext}
        >
          <SkipForward size={15} />
        </button>
        <button
          type="button"
          className="arco-btn arco-btn--ghost arco-btn--sm"
          onClick={restoreMusicWindow}
        ><T k={I18nKey.OS_BENTO_OPEN_MUSIC} /></button>
      </div>
    </div>
  );
}
