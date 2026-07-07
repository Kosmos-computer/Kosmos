import type { ReactNode } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "../../components/ui";
import type { ArtifactKind } from "./types";

interface ArtifactPageLayoutProps {
  title: string;
  description?: string;
  artifactKind?: ArtifactKind;
  generating?: boolean;
  onGenerate?: () => void;
  onCopy?: () => void;
  children: ReactNode;
}

/** Shared layout for per-asset pages — generate, copy, and content area. */
export function ArtifactPageLayout({
  title,
  description,
  artifactKind,
  generating,
  onGenerate,
  onCopy,
  children,
}: ArtifactPageLayoutProps) {
  return (
    <div className="arco-longformer-asset-page">
      <header className="arco-longformer-asset-page__header">
        <div>
          <h1 className="arco-longformer-asset-page__title">{title}</h1>
          {description ? <p className="arco-longformer-asset-page__desc">{description}</p> : null}
        </div>
        <div className="arco-longformer-asset-page__actions">
          {onCopy ? (
            <Button type="button" variant="default" onClick={onCopy}>
              Copy all
            </Button>
          ) : null}
          {artifactKind && onGenerate ? (
            <Button type="button" variant="primary" disabled={generating} onClick={onGenerate}>
              {generating ? <Loader2 size={14} className="arco-longformer-asset-page__spin" /> : <Sparkles size={14} />}
              Regenerate
            </Button>
          ) : null}
        </div>
      </header>
      <div className="arco-longformer-asset-page__body">{children}</div>
    </div>
  );
}
