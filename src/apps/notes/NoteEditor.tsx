import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Code2, Eye, PanelRight, Pencil } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "../../components/ui";
import { Menu, type MenuItem } from "../../components/Menu";
import { Breadcrumb } from "../../components/patterns";
import { NoteEditorMenu } from "./NoteEditorMenu";
import { NoteRichEditor } from "./NoteRichEditor";
import { NotesCanvasStub } from "./NotesCanvasStub";
import type { NoteEditorViewMode, NotePage } from "./types";
import type { JSONContent } from "@arco/editor-kit";

const VIEW_MODE_OPTIONS: {
  value: NoteEditorViewMode;
  labelKey: I18nKey;
  icon: LucideIcon;
}[] = [
  { value: "edit", labelKey: I18nKey.COMMON$EDIT, icon: Pencil },
  { value: "preview", labelKey: I18nKey.APPS$NOTES_PREVIEW, icon: Eye },
  { value: "code", labelKey: I18nKey.APPS$NOTES_CODE, icon: Code2 },
];

export function NoteEditor({
  note,
  noteDoc,
  canvasOpen,
  backlinkCount,
  wordCount,
  onToggleCanvas,
  onDocChange,
  onTitleChange,
  onTitleCommit,
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
  onTitleCommit: (title: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [viewMode, setViewMode] = useState<NoteEditorViewMode>("edit");

  useEffect(() => {
    setViewMode("edit");
  }, [note.id]);

  const activeViewMode = VIEW_MODE_OPTIONS.find((option) => option.value === viewMode) ?? VIEW_MODE_OPTIONS[0];
  const ActiveViewIcon = activeViewMode.icon;

  const viewModeItems = useMemo<MenuItem[]>(
    () =>
      VIEW_MODE_OPTIONS.map((option) => ({
        id: option.value,
        label: i18n.t(option.labelKey),
        icon: option.icon,
        checked: option.value === viewMode,
        onSelect: () => setViewMode(option.value),
      })),
    [viewMode],
  );

  return (
    <div className="arco-notes__workspace">
      <Breadcrumb
        items={[
          { label: "Arco" },
          { label: note.folder ?? "Notes" },
          { label: note.title, current: true },
        ]}
        actions={
          <>
            <Menu
              className="arco-notes__view-toggle"
              aria-label={i18n.t(I18nKey.APPS$NOTES_NOTE_VIEW_MODE)}
              side="bottom"
              align="end"
              portal
              items={viewModeItems}
              trigger={
                <button type="button" className="arco-notes__view-toggle-trigger">
                  <ActiveViewIcon size={12} aria-hidden="true" />
                  <span>{i18n.t(activeViewMode.labelKey)}</span>
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
              }
            />
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
        <div className="arco-notes__editor-pane">
          <NoteRichEditor
            noteId={note.id}
            content={noteDoc}
            viewMode={viewMode}
            onChange={onDocChange}
            beforeContent={
              <Input
                className="arco-notes__title-input"
                value={note.title}
                aria-label={i18n.t(I18nKey.APPS$NOTES_NOTE_TITLE)}
                readOnly={viewMode !== "edit"}
                onChange={(event) => onTitleChange(event.target.value)}
                onBlur={(event) => onTitleCommit(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
              />
            }
            afterContent={
              backlinkCount > 0 || wordCount > 0 ? (
                <footer className="arco-notes__meta">
                  {backlinkCount > 0 ? (
                    <span>
                      {backlinkCount}<T k={I18nKey.APPS$NOTES_BACKLINK} />{backlinkCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  {backlinkCount > 0 && wordCount > 0 ? <span aria-hidden="true"> · </span> : null}
                  {wordCount > 0 ? <span>{wordCount}<T k={I18nKey.APPS$NOTES_WORDS} /></span> : null}
                </footer>
              ) : null
            }
          />
        </div>

        {canvasOpen ? (
          <aside className="arco-notes__canvas-pane" aria-label={i18n.t(I18nKey.APPS$NOTES_NOTE_CONTEXT_CANVAS)}>
            <NotesCanvasStub noteTitle={note.title} onCollapse={onToggleCanvas} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
