import { I18nKey } from "../../../i18n/declaration";
import i18n from "../../../i18n/index";
import { T } from "../../../i18n/T";
import { ArtifactPageLayout } from "../ArtifactPageLayout";
import { linesFromArtifact } from "../artifactContent";
import type { LongformerViewModel } from "../longformerStore";
import type { TranscriptDetail } from "../types";

interface LongformerTitlesPageProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Numbered title suggestions from generated artifacts. */
export function LongformerTitlesPage({ vm, detail }: LongformerTitlesPageProps) {
  const artifact = detail.artifacts.find((a) => a.kind === "titles");
  const titles = linesFromArtifact(artifact);
  const fallback = [detail.title, `${detail.title} — key takeaways`, `Highlights from ${detail.title}`];
  const items = titles.length > 0 ? titles : fallback;

  const copyAll = () => void navigator.clipboard.writeText(items.map((t, i) => `${i + 1}. ${t}`).join("\n"));

  return (
    <ArtifactPageLayout
      title={i18n.t(I18nKey.APPS$LONGFORMER_TITLES)}
      description="Suggested episode titles generated from your transcript."
      artifactKind="titles"
      generating={vm.generatingArtifact === "titles"}
      onGenerate={() => void vm.generateArtifact("titles")}
      onCopy={copyAll}
    >
      <ol className="arco-longformer-titles-list">
        {items.map((title, index) => (
          <li key={`${index}-${title}`} className="arco-longformer-titles-list__item">
            <span className="arco-longformer-titles-list__index">{index + 1}</span>
            <span className="arco-longformer-titles-list__text">{title}</span>
            <button
              type="button"
              className="arco-longformer-titles-list__copy"
              onClick={() => void navigator.clipboard.writeText(title)}
            ><T k={I18nKey.COMMON$COPY} /></button>
          </li>
        ))}
      </ol>
    </ArtifactPageLayout>
  );
}
