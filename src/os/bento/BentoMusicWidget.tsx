import { Pause, Play, SkipForward } from "lucide-react";
import { useMusicStore } from "../../apps/music/musicStore";
import type { MusicImageTone } from "../../apps/music/types";

function artClass(tone: MusicImageTone) {
  return `arco-music__art arco-music__art--sm arco-music__art--${tone}`;
}

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
        <span className="arco-bento-card__label">Now playing</span>
        <span className="arco-bento-card__meta">Loading library…</span>
      </div>
    );
  }

  return (
    <div className="arco-bento-card arco-bento-card--music">
      <span className="arco-bento-card__label">Now playing</span>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--arco-space-s)" }}>
        <span className={artClass(track.albumArtTone)} aria-hidden="true" />
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
          aria-label="Next track"
          onClick={playNext}
        >
          <SkipForward size={15} />
        </button>
        <button
          type="button"
          className="arco-btn arco-btn--ghost arco-btn--sm"
          onClick={restoreMusicWindow}
        >
          Open Music
        </button>
      </div>
    </div>
  );
}
