import { useEffect, useState } from "react";
import { ChevronLeft, Code2, Eye, PanelRight, Pencil } from "lucide-react";
import { Avatar, Chip, Input } from "../../components/ui";
import { Breadcrumb } from "../../components/patterns";
import { NoteEditorMenu } from "./NoteEditorMenu";
import { NoteRichEditor } from "./NoteRichEditor";
import { NotesCanvasStub } from "./NotesCanvasStub";
import type { NoteEditorViewMode, NotePage } from "./types";
import type { JSONContent } from "@arco/editor-kit";

const COLLABORATORS = ["Alex Morgan", "Riley Chen", "Jordan Hayes"];

export function NoteEditor({
  note,
  noteDoc,
  canvasOpen,
  backlinkCount,
  wordCount,
  onToggleCanvas,
  onDocChange,
  onTitleChange,
  onDuplicate,
  onDelete,
}: {
  note: NotePage;
  noteDoc: JSONContent;
  canvasOpen: boolean;
  backlinkCount: number;
  wordCount: number;
  onToggleCanvas: () => void;
  onDocChange: (doc: JSONContent) => void;
  onTitleChange: (title: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [viewMode, setViewMode] = useState<NoteEditorViewMode>("edit");

  useEffect(() => {
    setViewMode("edit");
  }, [note.id]);

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
              aria-pressed={canvasOpen}
              aria-expanded={canvasOpen}
              title={canvasOpen ? "Hide context canvas" : "Show context canvas"}
              onClick={onToggleCanvas}
            >
              <PanelRight size={16} strokeWidth={1.75} />
            </button>
            <NoteEditorMenu
              noteId={note.id}
              title={note.title}
              noteDoc={noteDoc}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          </>
        }
      />

      <div className="arco-notes__body">
        <div className="arco-notes__editor-pane arco-scroll">
          <article className="arco-notes__page">
            <Input
              className="arco-notes__title-input"
              value={note.title}
              aria-label="Note title"
              readOnly={viewMode !== "edit"}
              onChange={(event) => onTitleChange(event.target.value)}
            />
            {note.tags && note.tags.length > 0 ? (
              <div className="arco-notes__tags">
                {note.tags.map((tag) => (
                  <span key={tag} className="arco-notes__tag">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="arco-notes__view-toggle arco-chip-row" role="group" aria-label="Note view mode">
              <Chip active={viewMode === "edit"} onClick={() => setViewMode("edit")}>
                <Pencil size={12} aria-hidden="true" /> Edit
              </Chip>
              <Chip active={viewMode === "preview"} onClick={() => setViewMode("preview")}>
                <Eye size={12} aria-hidden="true" /> Preview
              </Chip>
              <Chip active={viewMode === "code"} onClick={() => setViewMode("code")}>
                <Code2 size={12} aria-hidden="true" /> Code
              </Chip>
            </div>
            <NoteRichEditor
              noteId={note.id}
              content={noteDoc}
              viewMode={viewMode}
              onChange={onDocChange}
            />
            {(backlinkCount > 0 || wordCount > 0) && (
              <footer className="arco-notes__meta">
                {backlinkCount > 0 ? (
                  <span>
                    {backlinkCount} backlink{backlinkCount === 1 ? "" : "s"}
                  </span>
                ) : null}
                {backlinkCount > 0 && wordCount > 0 ? <span aria-hidden="true"> · </span> : null}
                {wordCount > 0 ? <span>{wordCount} words</span> : null}
              </footer>
            )}
          </article>
        </div>

        {canvasOpen ? (
          <aside className="arco-notes__canvas-pane" aria-label="Note context canvas">
            <NotesCanvasStub noteTitle={note.title} onCollapse={onToggleCanvas} />
          </aside>
        ) : (
          <button
            type="button"
            className="arco-notes__canvas-reveal"
            aria-expanded={false}
            title="Show context canvas"
            onClick={onToggleCanvas}
          >
            <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>Canvas</span>
          </button>
        )}
      </div>
    </div>
  );
}
