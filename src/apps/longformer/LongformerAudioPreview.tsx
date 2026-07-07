import { formatDuration } from "./types";
import { useLongformerPlayback } from "./LongformerPlaybackContext";

interface LongformerAudioPreviewProps {
  durationMs: number;
  currentMs: number;
}

/** Sticky audio preview rail — playback scrubber for transcript page. */
export function LongformerAudioPreview({ durationMs, currentMs }: LongformerAudioPreviewProps) {
  const { mediaUrl, seekTo } = useLongformerPlayback();

  if (!mediaUrl) {
    return (
      <div className="arco-longformer-audio-preview arco-longformer-audio-preview--empty">
        <p>No audio source for this transcript.</p>
      </div>
    );
  }

  const progress = durationMs > 0 ? (currentMs / durationMs) * 100 : 0;

  return (
    <div className="arco-longformer-audio-preview">
      <div className="arco-longformer-audio-preview__wave" aria-hidden="true">
        {Array.from({ length: 48 }, (_, i) => (
          <span
            key={i}
            className="arco-longformer-audio-preview__bar"
            style={{ height: `${20 + ((i * 7) % 60)}%`, opacity: (i / 48) * 100 < progress ? 1 : 0.35 }}
          />
        ))}
      </div>
      <input
        type="range"
        className="arco-longformer-audio-preview__scrub"
        min={0}
        max={durationMs}
        value={currentMs}
        onChange={(e) => seekTo(Number(e.target.value))}
        aria-label="Playback position"
      />
      <div className="arco-longformer-audio-preview__times">
        <span>{formatDuration(currentMs)}</span>
        <span>{formatDuration(durationMs)}</span>
      </div>
    </div>
  );
}
