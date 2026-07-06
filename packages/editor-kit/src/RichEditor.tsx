import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor, JSONContent } from "@tiptap/core";
import { createEditorExtensions } from "./createExtensions";

export interface RichEditorProps {
  content: JSONContent;
  /** When this changes, editor content is replaced (e.g. note id). */
  contentKey?: string;
  placeholder?: string;
  editable?: boolean;
  widgets?: boolean;
  slashCommands?: boolean;
  className?: string;
  contentClassName?: string;
  prosemirrorClassName?: string;
  ariaLabel?: string;
  onChange?: (doc: JSONContent) => void;
  onEditorReady?: (editor: Editor | null) => void;
}

export function RichEditor({
  content,
  contentKey,
  placeholder = "Start writing…",
  editable = true,
  widgets = true,
  slashCommands = true,
  className = "ek-editor",
  contentClassName = "ek-editor__content",
  prosemirrorClassName = "",
  ariaLabel = "Document body",
  onChange,
  onEditorReady,
}: RichEditorProps) {
  const extensions = createEditorExtensions({ placeholder, widgets, slashCommands });

  const editor = useEditor({
    extensions,
    content,
    editable,
    editorProps: {
      attributes: {
        class: prosemirrorClassName,
        "aria-label": ariaLabel,
      },
    },
    onUpdate: ({ editor: ed }) => onChange?.(ed.getJSON()),
  });

  useEffect(() => {
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    editor.view.dom.className = prosemirrorClassName;
    editor.view.dom.setAttribute("aria-label", ariaLabel);
  }, [editor, prosemirrorClassName, ariaLabel]);

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(content, false);
  }, [editor, contentKey]); // eslint-disable-line react-hooks/exhaustive-deps -- reload when note changes

  if (!editor) return null;

  return (
    <div className={className}>
      <EditorContent editor={editor} className={contentClassName} />
    </div>
  );
}
