import { LongformerArtifactsPanel } from "./LongformerArtifactsPanel";
import { LongformerEditorToolbar } from "./LongformerEditorToolbar";
import { LongformerInspector } from "./LongformerInspector";
import { LongformerTimeline } from "./LongformerTimeline";
import { LongformerTranscriptPane } from "./LongformerTranscriptPane";
import { PreviewPane } from "../../components/patterns";
import type { LongformerViewModel } from "./longformerStore";
import type { TranscriptDetail } from "./types";

interface LongformerEditorProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Full transcript editor — toolbar, text surface, inspector, and timeline. */
export function LongformerEditor({ vm, detail }: LongformerEditorProps) {
  return (
    <div className="arco-longformer-editor">
      <LongformerEditorToolbar vm={vm} detail={detail} />

      <div className="arco-longformer-editor__body">
        <div className="arco-longformer-editor__center">
          <LongformerTranscriptPane vm={vm} detail={detail} />
          <LongformerTimeline vm={vm} detail={detail} />
        </div>

        <PreviewPane width={vm.inspectorWidth} onWidthChange={vm.setInspectorWidth}>
          <LongformerInspector vm={vm} detail={detail} />
        </PreviewPane>
      </div>

      <LongformerArtifactsPanel vm={vm} detail={detail} />
    </div>
  );
}
