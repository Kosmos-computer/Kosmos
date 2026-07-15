import { I18nKey } from "../../../i18n/declaration";
import i18n from "../../../i18n/index";
import { T } from "../../../i18n/T";
import { ArtifactPageLayout } from "../ArtifactPageLayout";
import type { LongformerViewModel } from "../longformerStore";
import type { TranscriptDetail } from "../types";
import { formatTimecode } from "../types";

interface LongformerChaptersPageProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Chapter markers with timestamps — from pipeline or regenerate. */
export function LongformerChaptersPage({ vm, detail }: LongformerChaptersPageProps) {
  const artifact = detail.artifacts.find((a) => a.kind === "chapters");

  const copyAll = () => {
    const text =
      artifact?.content ??
      detail.chapters
        .map((ch, i) => `${i + 1}. ${ch.label} (${formatTimecode(ch.startMs)})`)
        .join("\n");
    void navigator.clipboard.writeText(text);
  };

  return (
    <ArtifactPageLayout
      title={i18n.t(I18nKey.APPS$LONGFORMER_CHAPTERS)}
      description="Timestamped chapter markers generated from your transcript."
      artifactKind="chapters"
      generating={vm.generatingArtifact === "chapters"}
      onGenerate={() => void vm.generateArtifact("chapters")}
      onCopy={copyAll}
    >
      {detail.chapters.length > 0 ? (
        <ol className="arco-longformer-chapters-list">
          {detail.chapters.map((chapter, index) => (
            <li key={chapter.id} className="arco-longformer-chapters-list__item">
              <span className="arco-longformer-chapters-list__index">{index + 1}</span>
              <span className="arco-longformer-chapters-list__time">{formatTimecode(chapter.startMs)}</span>
              <span className="arco-longformer-chapters-list__label">{chapter.label}</span>
            </li>
          ))}
        </ol>
      ) : artifact ? (
        <pre className="arco-longformer-asset-page__content">{artifact.content}</pre>
      ) : (
        <p className="arco-longformer-asset-page__empty"><T k={I18nKey.APPS$LONGFORMER_NO_CHAPTERS_YET_REGENERATE_TO_CREATE_CHAPTER_MARKERS} /></p>
      )}
    </ArtifactPageLayout>
  );
}
