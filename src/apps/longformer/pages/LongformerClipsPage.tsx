import { Play } from "lucide-react";
import { ArtifactPageLayout } from "../ArtifactPageLayout";
import { collectClipCards } from "../artifactContent";
import { formatDuration } from "../types";
import type { LongformerViewModel } from "../longformerStore";
import type { TranscriptDetail } from "../types";

interface LongformerClipsPageProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Suggested clips grid — timeline clips and generated suggestions. */
export function LongformerClipsPage({ vm, detail }: LongformerClipsPageProps) {
  const clips = collectClipCards(detail);
  const artifact = detail.artifacts.find((a) => a.kind === "clips");

  const copyAll = () => {
    const text = clips
      .map((c) =>
        c.startMs > 0
          ? `• ${c.label} (${formatDuration(c.endMs - c.startMs)})`
          : `• ${c.label}`,
      )
      .join("\n");
    void navigator.clipboard.writeText(text || artifact?.content || "");
  };

  return (
    <ArtifactPageLayout
      title="Clips"
      description="Short segments worth sharing — select text in Transcript to create new clips."
      artifactKind="clips"
      generating={vm.generatingArtifact === "clips"}
      onGenerate={() => void vm.generateArtifact("clips")}
      onCopy={clips.length > 0 || artifact ? copyAll : undefined}
    >
      {clips.length > 0 ? (
        <div className="arco-longformer-clips-grid">
          {clips.map((clip) => (
            <article
              key={clip.id}
              className="arco-longformer-clips-card"
              onClick={() => {
                if (clip.startMs > 0) {
                  vm.selectClip(clip.id);
                  vm.setCurrentMs(clip.startMs);
                }
              }}
            >
              <div className="arco-longformer-clips-card__thumb" aria-hidden="true">
                <Play size={20} strokeWidth={1.75} />
              </div>
              <h3>{clip.label}</h3>
              {clip.startMs > 0 ? (
                <p className="arco-longformer-clips-card__meta">
                  {formatDuration(clip.startMs)} · {formatDuration(clip.endMs - clip.startMs)}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="arco-longformer-asset-page__empty">
          No clips yet. Regenerate suggestions or highlight text in Transcript and choose Create clip.
        </p>
      )}
    </ArtifactPageLayout>
  );
}
