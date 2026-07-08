import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { Plus } from "lucide-react";
import { Button, Switch } from "../../components/ui";
import type { LongformerViewModel } from "./longformerStore";
import type { TranscriptDetail } from "./types";
import { formatDuration } from "./types";

interface LongformerInspectorProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

function DialControl({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="arco-longformer-inspector__dial">
      <span className="arco-longformer-inspector__dial-label">{label}</span>
      <div className="arco-longformer-inspector__dial-ring" aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" className="arco-longformer-inspector__dial-track" />
          <circle
            cx="24"
            cy="24"
            r="20"
            className="arco-longformer-inspector__dial-fill"
            style={{ strokeDashoffset: `${125 - (value + 20) * 2}` }}
          />
        </svg>
        <span className="arco-longformer-inspector__dial-value">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        className="arco-longformer-inspector__dial-slider"
        min={label === "Volume" ? -24 : 0.5}
        max={label === "Volume" ? 12 : 2}
        step={label === "Volume" ? 1 : 0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}

/** Right inspector — clip settings, audio processing, and effects. */
export function LongformerInspector({ vm, detail }: LongformerInspectorProps) {
  const selectedClip = detail.tracks
    .flatMap((t) => t.clips)
    .find((c) => c.id === detail.selectedClipId);

  const clipDuration = selectedClip ? selectedClip.endMs - selectedClip.startMs : 0;

  return (
    <div className="arco-longformer-inspector">
      <header className="arco-longformer-inspector__header">
        <h2><T k={I18nKey.APPS$LONGFORMER_SEQUENCE_CLIP} /></h2>
        {selectedClip ? <span className="arco-longformer-inspector__clip-name">{selectedClip.label}</span> : null}
      </header>

      <div className="arco-longformer-inspector__section">
        <label className="arco-longformer-inspector__field">
          <span><T k={I18nKey.APPS$LONGFORMER_DURATION} /></span>
          <input
            type="text"
            readOnly
            value={formatDuration(clipDuration)}
            className="arco-input arco-longformer-inspector__input"
          />
        </label>
      </div>

      <div className="arco-longformer-inspector__dials">
        <DialControl
          label={i18n.t(I18nKey.APPS$LONGFORMER_VOLUME)}
          value={detail.volumeDb}
          unit=" dB"
          onChange={(volumeDb) => vm.updateClipSettings({ volumeDb })}
        />
        <DialControl
          label={i18n.t(I18nKey.APPS$KAMIJI_SPEED)}
          value={detail.speed}
          unit="×"
          onChange={(speed) => vm.updateClipSettings({ speed })}
        />
      </div>

      <div className="arco-longformer-inspector__section">
        <div className="arco-longformer-inspector__row">
          <span className="arco-longformer-inspector__section-title"><T k={I18nKey.APPS$LONGFORMER_COMPRESSOR} /></span>
          <Switch
            checked={detail.compressorEnabled}
            onChange={(e) => vm.updateClipSettings({ compressorEnabled: e.target.checked })}
            label={i18n.t(I18nKey.APPS$LONGFORMER_ENABLE_COMPRESSOR)}
          />
        </div>
        <label className="arco-longformer-inspector__field">
          <span><T k={I18nKey.APPS$LONGFORMER_PRESET} /></span>
          <select
            className="arco-input arco-longformer-inspector__select"
            value={detail.compressorPreset}
            onChange={(e) => vm.updateClipSettings({ compressorPreset: e.target.value })}
          >
            <option><T k={I18nKey.APPS$LONGFORMER_CLASSIC_VOICEOVER} /></option>
            <option><T k={I18nKey.APPS$LONGFORMER_PODCAST_WARMTH} /></option>
            <option><T k={I18nKey.APPS$LONGFORMER_BROADCAST_LOUD} /></option>
            <option><T k={I18nKey.APPS$LONGFORMER_TRANSPARENT} /></option>
          </select>
        </label>
      </div>

      <div className="arco-longformer-inspector__section">
        <Button type="button" variant="default" className="arco-longformer-inspector__add-effect">
          <Plus size={14} strokeWidth={1.75} /><T k={I18nKey.APPS$LONGFORMER_ADD_EFFECT} /></Button>
      </div>
    </div>
  );
}
