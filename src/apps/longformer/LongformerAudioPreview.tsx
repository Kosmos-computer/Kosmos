import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
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
        <p><T k={I18nKey.APPS$LONGFORMER_NO_AUDIO_SOURCE_FOR_THIS_TRANSCRIPT} /></p>
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
        aria-label={i18n.t(I18nKey.APPS$LONGFORMER_PLAYBACK_POSITION)}
      />
      <div className="arco-longformer-audio-preview__times">
        <span>{formatDuration(currentMs)}</span>
        <span>{formatDuration(durationMs)}</span>
      </div>
    </div>
  );
}
