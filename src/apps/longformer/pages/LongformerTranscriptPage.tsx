import { LongformerEditorToolbar } from "../LongformerEditorToolbar";
import { LongformerInspector } from "../LongformerInspector";
import { LongformerTimeline } from "../LongformerTimeline";
import { LongformerTranscriptPane } from "../LongformerTranscriptPane";
import { PreviewPane } from "../../../components/patterns";
import type { LongformerViewModel } from "../longformerStore";
import type { TranscriptDetail } from "../types";

interface LongformerTranscriptPageProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Transcript editor — text surface, timeline, and inspector. */
export function LongformerTranscriptPage({ vm, detail }: LongformerTranscriptPageProps) {
  return (
    <div className="arco-longformer-transcript-page">
      <LongformerEditorToolbar vm={vm} detail={detail} />
      <div className="arco-longformer-transcript-page__body">
        <div className="arco-longformer-transcript-page__center">
          <LongformerTranscriptPane vm={vm} detail={detail} />
          <LongformerTimeline vm={vm} detail={detail} />
        </div>
        <PreviewPane width={vm.inspectorWidth} onWidthChange={vm.setInspectorWidth}>
          <LongformerInspector vm={vm} detail={detail} />
        </PreviewPane>
      </div>
    </div>
  );
}
