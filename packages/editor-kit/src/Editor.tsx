import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import type { JSONContent } from "@tiptap/core";
import { useEffect } from "react";
import { ArcoWidget } from "./extensions/arcoWidget";

export interface DocEditorProps {
  content: JSONContent;
  placeholder?: string;
  onChange?: (doc: JSONContent) => void;
  editable?: boolean;
}

export function DocEditor({
  content,
  placeholder = "Start writing…",
  onChange,
  editable = true,
}: DocEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder }),
      ArcoWidget,
    ],
    content,
    editable,
    onUpdate: ({ editor: ed }) => onChange?.(ed.getJSON()),
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
