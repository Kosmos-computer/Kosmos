import { BarChart3, ChevronLeft, Component, Table2 } from "lucide-react";
import { EmptyState } from "../../components/ui";

/** Placeholder for the note context canvas — graphs, tables, MD blocks, generative widgets. */
export function NotesCanvasStub({
  noteTitle,
  onCollapse,
}: {
  noteTitle: string;
  onCollapse?: () => void;
}) {
  return (
    <div className="arco-notes-canvas">
      <header className="arco-notes-canvas__header">
        <span className="arco-notes-canvas__title">Context canvas</span>
        {onCollapse ? (
          <button
            type="button"
            className="arco-notes-canvas__collapse"
            aria-label="Hide context canvas"
            title="Hide canvas"
            onClick={onCollapse}
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
          </button>
        ) : null}
      </header>
      <EmptyState className="arco-notes-canvas__stub" title="Canvas coming soon">
        <p className="arco-notes-canvas__copy">
          This panel will render dynamic views for <strong>{noteTitle}</strong> — link graphs, table
          summaries, styled markdown blocks, and generative components driven by note content.
        </p>
        <ul className="arco-notes-canvas__preview" aria-label="Planned canvas modes">
          <li>
            <BarChart3 size={14} strokeWidth={1.75} aria-hidden="true" />
            Data viz from tables &amp; sheets
          </li>
          <li>
            <Table2 size={14} strokeWidth={1.75} aria-hidden="true" />
            Structured previews &amp; pivots
          </li>
          <li>
            <Component size={14} strokeWidth={1.75} aria-hidden="true" />
            Live blocks &amp; MD-style components
          </li>
        </ul>
      </EmptyState>
    </div>
  );
}
