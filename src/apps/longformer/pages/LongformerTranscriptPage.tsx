import { LongformerAudioPreview } from "../LongformerAudioPreview";
import { LongformerEditorToolbar } from "../LongformerEditorToolbar";
import { LongformerInspector } from "../LongformerInspector";
import { LongformerPlaybackProvider } from "../LongformerPlaybackContext";
import { LongformerTimeline } from "../LongformerTimeline";
import { LongformerTranscriptPane } from "../LongformerTranscriptPane";
import { PreviewPane } from "../../../components/patterns";
import type { LongformerViewModel } from "../longformerStore";
import type { TranscriptDetail } from "../types";

interface LongformerTranscriptPageProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Transcript editor — playback, text surface, timeline, and inspector. */
export function LongformerTranscriptPage({ vm, detail }: LongformerTranscriptPageProps) {
  return (
    <LongformerPlaybackProvider vm={vm} detail={detail}>
      <div className="arco-longformer-transcript-page">
        <LongformerEditorToolbar vm={vm} detail={detail} />
        <div className="arco-longformer-transcript-page__body">
          <div className="arco-longformer-transcript-page__center">
            <LongformerTranscriptPane vm={vm} detail={detail} />
            <LongformerTimeline vm={vm} detail={detail} />
          </div>
          <PreviewPane width={vm.inspectorWidth} onWidthChange={vm.setInspectorWidth}>
            <LongformerAudioPreview durationMs={detail.durationMs} currentMs={detail.currentMs} />
            <LongformerInspector vm={vm} detail={detail} />
          </PreviewPane>
        </div>
      </div>
    </LongformerPlaybackProvider>
  );
}
