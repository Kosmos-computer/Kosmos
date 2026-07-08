import { I18nKey } from "../../../i18n/declaration";
import i18n from "../../../i18n/index";
import { ArtifactPageLayout } from "../ArtifactPageLayout";
import type { LongformerViewModel } from "../longformerStore";
import type { TranscriptDetail } from "../types";
import { useTranslation } from "react-i18next";

interface LongformerSummariesPageProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Editable show-notes summary — persists on change. */
export function LongformerSummariesPage({ vm, detail }: LongformerSummariesPageProps) {
  const { t } = useTranslation();
  const artifact = detail.artifacts.find((a) => a.kind === "summaries");
  const content = artifact?.content ?? "";

  const copyAll = () => {
    if (content) void navigator.clipboard.writeText(content);
  };

  return (
    <ArtifactPageLayout
      title={i18n.t(I18nKey.APPS$LONGFORMER_SUMMARY)}
      description="Show notes and episode summary. Edits save automatically."
      artifactKind="summaries"
      generating={vm.generatingArtifact === "summaries"}
      onGenerate={() => void vm.generateArtifact("summaries")}
      onCopy={content ? copyAll : undefined}
    >
      <textarea
        className="arco-longformer-summary-editor"
        value={content}
        placeholder={i18n.t(I18nKey.APPS$LONGFORMER_GENERATE_A_SUMMARY_FROM_YOUR_TRANSCRIPT_THEN_EDIT_HERE)}
        rows={14}
        onChange={(e) => vm.updateArtifactContent("summaries", e.target.value)}
      />
    </ArtifactPageLayout>
  );
}
