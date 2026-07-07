import { ArtifactPageLayout } from "../ArtifactPageLayout";
import { linesFromArtifact } from "../artifactContent";
import type { LongformerViewModel } from "../longformerStore";
import type { TranscriptDetail } from "../types";

interface LongformerQuotesPageProps {
  vm: LongformerViewModel;
  detail: TranscriptDetail;
}

/** Pull quotes as a card list. */
export function LongformerQuotesPage({ vm, detail }: LongformerQuotesPageProps) {
  const artifact = detail.artifacts.find((a) => a.kind === "quotes");
  const quotes = linesFromArtifact(artifact);

  const copyAll = () => void navigator.clipboard.writeText(quotes.join("\n\n"));

  return (
    <ArtifactPageLayout
      title="Quotes"
      description="Pull quotes and highlights worth sharing."
      artifactKind="quotes"
      generating={vm.generatingArtifact === "quotes"}
      onGenerate={() => void vm.generateArtifact("quotes")}
      onCopy={quotes.length > 0 ? copyAll : undefined}
    >
      {quotes.length > 0 ? (
        <div className="arco-longformer-quotes-list">
          {quotes.map((quote, index) => (
            <blockquote key={`${index}-${quote.slice(0, 24)}`} className="arco-longformer-quotes-list__item">
              <p>{quote}</p>
              <button
                type="button"
                className="arco-longformer-quotes-list__copy"
                onClick={() => void navigator.clipboard.writeText(quote)}
              >
                Copy
              </button>
            </blockquote>
          ))}
        </div>
      ) : (
        <p className="arco-longformer-asset-page__empty">
          No quotes yet. Regenerate to extract highlights from your transcript.
        </p>
      )}
    </ArtifactPageLayout>
  );
}
