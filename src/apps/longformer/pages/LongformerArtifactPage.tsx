import { ArtifactPageLayout } from "../ArtifactPageLayout";
import type { LongformerViewModel } from "../longformerStore";
import type { ArtifactKind, TranscriptDetail } from "../types";

const ASSET_VIEWS = ["titles", "summaries", "quotes", "clips", "notes", "reels"] as const;
type AssetView = (typeof ASSET_VIEWS)[number];

const ASSET_COPY: Record<AssetView, { title: string; description: string; kind: ArtifactKind }> = {
  titles: {
    title: "Titles",
    description: "Suggested episode titles generated from your transcript.",
    kind: "titles",
  },
  summaries: {
    title: "Summary",
    description: "Show notes and episode summary for publishing.",
    kind: "summaries",
  },
  quotes: {
    title: "Quotes",
    description: "Pull quotes and highlights worth sharing.",
    kind: "quotes",
  },
  clips: {
    title: "Clips",
    description: "Suggested short clips from the transcript.",
    kind: "clips",
  },
  notes: {
    title: "Notes",
    description: "Structured notes and bullet points from the conversation.",
    kind: "notes",
  },
  reels: {
    title: "Reels",
    description: "Short-form reel scripts and segment ideas.",
    kind: "reels",
  },
};

interface LongformerArtifactPageProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
  view: AssetView;
}

/** Generic asset page for generated text artifacts. */
export function LongformerArtifactPage({ vm, detail, view }: LongformerArtifactPageProps) {
  const meta = ASSET_COPY[view];
  const artifact = detail.artifacts.find((a) => a.kind === meta.kind);

  const copyAll = () => {
    if (artifact?.content) void navigator.clipboard.writeText(artifact.content);
  };

  return (
    <ArtifactPageLayout
      title={meta.title}
      description={meta.description}
      artifactKind={meta.kind}
      generating={vm.generatingArtifact === meta.kind}
      onGenerate={() => void vm.generateArtifact(meta.kind)}
      onCopy={artifact ? copyAll : undefined}
    >
      {artifact ? (
        <article className="arco-longformer-asset-card">
          <header className="arco-longformer-asset-card__meta">
            <span data-status={artifact.status}>{artifact.status}</span>
            <time>{artifact.createdAt}</time>
          </header>
          <pre className="arco-longformer-asset-page__content">{artifact.content}</pre>
        </article>
      ) : (
        <p className="arco-longformer-asset-page__empty">
          No {meta.title.toLowerCase()} generated yet. Click Regenerate to create from your transcript.
        </p>
      )}
    </ArtifactPageLayout>
  );
}
