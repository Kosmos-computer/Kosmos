import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { Clapperboard, UserRound } from "lucide-react";
import { Button } from "../../components/ui";
import type { Speaker } from "./types";

export interface TranscriptSelection {
  text: string;
  segmentIds: string[];
  startMs: number;
  endMs: number;
  rect: { top: number; left: number };
}

interface LongformerSelectionToolbarProps {
  selection: TranscriptSelection;
  speakers: Speaker[];
  onChangeSpeaker: (speakerId: string) => void;
  onCreateClip: () => void;
  onClose: () => void;
}

/** Floating toolbar on transcript text selection — change speaker or create clip. */
export function LongformerSelectionToolbar({
  selection,
  speakers,
  onChangeSpeaker,
  onCreateClip,
  onClose,
}: LongformerSelectionToolbarProps) {
  return (
    <div
      className="arco-longformer-selection-toolbar"
      style={{ top: selection.rect.top, left: selection.rect.left }}
      role="toolbar"
      aria-label={i18n.t(I18nKey.APPS$LONGFORMER_TRANSCRIPT_SELECTION_ACTIONS)}
    >
      <label className="arco-longformer-selection-toolbar__speaker">
        <UserRound size={14} strokeWidth={1.75} />
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) onChangeSpeaker(e.target.value);
            onClose();
          }}
          aria-label={i18n.t(I18nKey.APPS$LONGFORMER_CHANGE_SPEAKER)}
        >
          <option value="" disabled><T k={I18nKey.APPS$LONGFORMER_CHANGE_SPEAKER} /></option>
          {speakers.map((speaker) => (
            <option key={speaker.id} value={speaker.id}>
              {speaker.name}
            </option>
          ))}
        </select>
      </label>
      <Button type="button" variant="default" onClick={onCreateClip}>
        <Clapperboard size={14} strokeWidth={1.75} /><T k={I18nKey.APPS$LONGFORMER_CREATE_CLIP} /></Button>
    </div>
  );
}
