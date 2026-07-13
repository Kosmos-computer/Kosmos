import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { useEffect } from "react";
import { createEditorExtensions } from "./createExtensions";

export interface DocEditorProps {
  content: JSONContent;
  placeholder?: string;
  onChange?: (doc: JSONContent) => void;
  editable?: boolean;
  /** Called once when the TipTap editor instance is ready (for toolbars). */
  onEditorReady?: (editor: import("@tiptap/core").Editor) => void;
}

export function DocEditor({
  content,
  placeholder = "Start writing…",
  onChange,
  editable = true,
  onEditorReady,
}: DocEditorProps) {
  const editor = useEditor({
    extensions: createEditorExtensions({ placeholder, widgets: true, slashCommands: true, richBlocks: true }),
    content,
    editable,
    onUpdate: ({ editor: ed }) => onChange?.(ed.getJSON()),
    onCreate: ({ editor: ed }) => onEditorReady?.(ed),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(content);
    if (current !== next) {
      editor.commands.setContent(content, false);
    }
  }, [editor, content]);

  if (!editor) return null;

  return (
    <div className="ek-editor">
      <EditorContent editor={editor} className="ek-editor__content" />
    </div>
  );
}

export { ArcoWidget } from "./extensions/arcoWidget.js";
export { exportDocToMarkdown, importMarkdownToDoc } from "@shared/docFormat";
export type { JSONContent };
