import { ArtifactPageLayout } from "../ArtifactPageLayout";
import type { LongformerViewModel } from "../longformerStore";
import type { TranscriptDetail } from "../types";

interface LongformerSummariesPageProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Editable show-notes summary — persists on change. */
export function LongformerSummariesPage({ vm, detail }: LongformerSummariesPageProps) {
  const artifact = detail.artifacts.find((a) => a.kind === "summaries");
  const content = artifact?.content ?? "";

  const copyAll = () => {
    if (content) void navigator.clipboard.writeText(content);
  };

  return (
    <ArtifactPageLayout
      title="Summary"
      description="Show notes and episode summary. Edits save automatically."
      artifactKind="summaries"
      generating={vm.generatingArtifact === "summaries"}
      onGenerate={() => void vm.generateArtifact("summaries")}
      onCopy={content ? copyAll : undefined}
    >
      <textarea
        className="arco-longformer-summary-editor"
        value={content}
        placeholder="Generate a summary from your transcript, then edit here…"
        rows={14}
        onChange={(e) => vm.updateArtifactContent("summaries", e.target.value)}
      />
    </ArtifactPageLayout>
  );
}
