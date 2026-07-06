import { Globe, PanelRight } from "lucide-react";
import { Avatar, EmptyState } from "../../components/ui";
import { Breadcrumb, EditorToolbar } from "../../components/patterns";
import { NoteDocBlock } from "./NoteDocBlock";
import type { NotePage, NotesView } from "./types";

const COLLABORATORS = ["Alex Morgan", "Riley Chen", "Jordan Hayes"];

export function NoteEditor({
  note,
  view,
  onViewChange,
}: {
  note: NotePage;
  view: NotesView;
  onViewChange: (view: NotesView) => void;
}) {
  if (view === "graph") {
    return (
      <div className="arco-notes__workspace">
        <Breadcrumb
          items={[
            { label: "Arco" },
            { label: note.folder ?? "Notes" },
            { label: note.title, current: true },
          ]}
          actions={
            <button
              type="button"
              className="arco-notes__graph-toggle"
              aria-pressed
              title="Full graph view"
              onClick={() => onViewChange("editor")}
            >
              <Globe size={16} strokeWidth={1.75} />
            </button>
          }
        />
        <EmptyState title="Graph view">Vault graph wiring comes in a later phase.</EmptyState>
      </div>
    );
  }

  return (
    <div className="arco-notes__workspace">
      <Breadcrumb
        items={[
          { label: "Arco" },
          { label: note.folder ?? "Notes" },
          { label: note.title, current: true },
        ]}
        collaborators={
          <div className="arco-notes__avatars" aria-label={`${COLLABORATORS.length} collaborators`}>
            {COLLABORATORS.map((name) => (
              <Avatar key={name} name={name} size="sm" />
            ))}
          </div>
        }
        actions={
          <>
            <button
              type="button"
              className="arco-notes__graph-toggle"
              aria-pressed={false}
              title="Full graph view"
              onClick={() => onViewChange("graph")}
            >
              <Globe size={16} strokeWidth={1.75} />
            </button>
            <button type="button" className="arco-notes__graph-toggle" aria-pressed={false} title="Show graph panel">
              <PanelRight size={16} strokeWidth={1.75} />
            </button>
          </>
        }
      />

      <EditorToolbar />

      <div className="arco-notes__body">
        <div className="arco-notes__editor-pane arco-scroll">
          <article className="arco-notes__page">
            <h1 className="arco-notes__title">{note.title}</h1>
            {note.tags && note.tags.length > 0 ? (
              <div className="arco-notes__tags">
                {note.tags.map((tag) => (
                  <span key={tag} className="arco-notes__tag">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
            {note.blocks.map((block) => (
              <NoteDocBlock key={block.id} block={block} />
            ))}
            {(note.backlinks !== undefined || note.wordCount !== undefined) && (
              <footer className="arco-notes__meta">
                {note.backlinks !== undefined && note.backlinks > 0 ? (
                  <span>
                    {note.backlinks} backlink{note.backlinks === 1 ? "" : "s"}
                  </span>
                ) : null}
                {note.backlinks !== undefined &&
                  note.backlinks > 0 &&
                  note.wordCount !== undefined && <span aria-hidden="true"> · </span>}
                {note.wordCount !== undefined ? <span>{note.wordCount} words</span> : null}
              </footer>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
