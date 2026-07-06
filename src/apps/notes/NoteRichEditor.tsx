import { useState } from "react";
import {
  RichEditor,
  applyBlockFormat,
  setTextAlign,
  toggleTextMark,
  useEditorToolbar,
  type Editor,
  type JSONContent,
} from "@arco/editor-kit";
import { EditorToolbar } from "../../components/patterns/EditorToolbar";
import { NoteCodeEditor } from "./NoteCodeEditor";
import type { NoteEditorViewMode } from "./types";

export function NoteRichEditor({
  noteId,
  content,
  viewMode = "edit",
  onChange,
}: {
  noteId: string;
  content: JSONContent;
  viewMode?: NoteEditorViewMode;
  onChange: (doc: JSONContent) => void;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const toolbar = useEditorToolbar(editor, viewMode === "edit");

  if (viewMode === "code") {
    return <NoteCodeEditor noteId={noteId} content={content} onChange={onChange} />;
  }

  const prosemirrorClass = [
    "arco-notes__prosemirror",
    viewMode === "preview" ? "arco-notes__prosemirror--readonly" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {viewMode === "edit" && editor ? (
        <EditorToolbar
          blockFormat={toolbar.blockFormat}
          onBlockFormatChange={(format) => applyBlockFormat(editor, format)}
          activeMarks={toolbar.marks}
          onToggleMark={(mark) => toggleTextMark(editor, mark)}
          align={toolbar.align}
          onAlignChange={(align) => setTextAlign(editor, align)}
          canUndo={toolbar.canUndo}
          canRedo={toolbar.canRedo}
          onUndo={() => editor.chain().focus().undo().run()}
          onRedo={() => editor.chain().focus().redo().run()}
        />
      ) : null}
      <div className="arco-notes__editor-surface">
        <RichEditor
          content={content}
          contentKey={noteId}
          editable={viewMode === "edit"}
          widgets
          slashCommands
          className="arco-notes__editor-content"
          contentClassName="arco-notes__editor-content"
          prosemirrorClassName={prosemirrorClass}
          ariaLabel={viewMode === "preview" ? "Note preview" : "Note body"}
          onChange={onChange}
          onEditorReady={setEditor}
        />
      </div>
    </>
  );
}
