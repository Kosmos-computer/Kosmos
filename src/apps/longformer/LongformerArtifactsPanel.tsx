import { Loader2, Sparkles } from "lucide-react";
import { Button } from "../../components/ui";
import type { ArtifactKind } from "./types";
import type { LongformerViewModel } from "./useLongformerStub";
import type { TranscriptDetail } from "./types";

const ARTIFACT_OPTIONS: { kind: ArtifactKind; label: string }[] = [
  { kind: "chapters", label: "Chapters" },
  { kind: "clips", label: "Clips" },
  { kind: "reels", label: "Reels" },
  { kind: "titles", label: "Titles" },
  { kind: "notes", label: "Notes" },
  { kind: "summaries", label: "Summaries" },
  { kind: "quotes", label: "Quotes" },
];

interface LongformerArtifactsPanelProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Artifact generation strip — chapters, clips, reels, titles, notes, summaries, quotes. */
export function LongformerArtifactsPanel({ vm, detail }: LongformerArtifactsPanelProps) {
  return (
    <footer className="arco-longformer-artifacts">
      <div className="arco-longformer-artifacts__generate">
        <span className="arco-longformer-artifacts__label">
          <Sparkles size={14} strokeWidth={1.75} />
          Generate from transcript
        </span>
        <div className="arco-longformer-artifacts__buttons">
          {ARTIFACT_OPTIONS.map(({ kind, label }) => (
            <Button
              key={kind}
              type="button"
              variant="default"
             
              disabled={vm.generatingArtifact !== null}
              onClick={() => void vm.generateArtifact(kind)}
            >
              {vm.generatingArtifact === kind ? (
                <Loader2 size={14} className="arco-longformer-artifacts__spin" />
              ) : null}
              {label}
            </Button>
          ))}
        </div>
      </div>

      {detail.artifacts.length > 0 ? (
        <div className="arco-longformer-artifacts__list">
          {detail.artifacts.map((artifact) => (
            <article key={artifact.id} className="arco-longformer-artifacts__card">
              <header>
                <span className="arco-longformer-artifacts__kind">{artifact.kind}</span>
                <span className="arco-longformer-artifacts__status" data-status={artifact.status}>
                  {artifact.status}
                </span>
              </header>
              <h3>{artifact.title}</h3>
              <pre>{artifact.content}</pre>
              <span className="arco-longformer-artifacts__date">{artifact.createdAt}</span>
            </article>
          ))}
        </div>
      ) : null}
    </footer>
  );
}
