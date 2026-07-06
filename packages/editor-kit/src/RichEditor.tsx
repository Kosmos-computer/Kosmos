import { useEffect, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor, JSONContent } from "@tiptap/core";
import { EditorBubbleMenu, type BubbleMenuExtraAction } from "./EditorBubbleMenu";
import { createEditorExtensions } from "./createExtensions";

export interface RichEditorProps {
  content: JSONContent;
  /** When this changes, editor content is replaced (e.g. note id). */
  contentKey?: string;
  placeholder?: string;
  editable?: boolean;
  widgets?: boolean;
  slashCommands?: boolean;
  /** Selection bubble menu for inline marks. Default true when editable. */
  bubbleMenu?: boolean;
  bubbleMenuActions?: BubbleMenuExtraAction[];
  className?: string;
  contentClassName?: string;
  prosemirrorClassName?: string;
  ariaLabel?: string;
  onChange?: (doc: JSONContent) => void;
  onEditorReady?: (editor: Editor | null) => void;
}

function prosemirrorClassNames(customClass?: string) {
  return ["ProseMirror", customClass].filter(Boolean).join(" ");
}

export function RichEditor({
  content,
  contentKey,
  placeholder = "Start writing…",
  editable = true,
  widgets = true,
  slashCommands = true,
  bubbleMenu,
  bubbleMenuActions,
  className = "ek-editor",
  contentClassName = "ek-editor__content",
  prosemirrorClassName = "",
  ariaLabel = "Document body",
  onChange,
  onEditorReady,
}: RichEditorProps) {
  const showBubbleMenu = bubbleMenu ?? editable;
  const prosemirrorClass = prosemirrorClassNames(prosemirrorClassName);

  const extensions = useMemo(
    () => createEditorExtensions({ placeholder, widgets, slashCommands }),
    [placeholder, widgets, slashCommands],
  );

  const editor = useEditor(
    {
      extensions,
      content,
      editable,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: prosemirrorClass,
          "aria-label": ariaLabel,
        },
      },
      onUpdate: ({ editor: ed }) => onChange?.(ed.getJSON()),
    },
    [extensions],
  );

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
    const dom = editor.view.dom;
    const stateClasses = Array.from(dom.classList).filter((name) => name.startsWith("ProseMirror-"));
    dom.className = [prosemirrorClass, ...stateClasses].filter(Boolean).join(" ");
    dom.setAttribute("aria-label", ariaLabel);
  }, [editor, prosemirrorClass, ariaLabel]);

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(content, false);
  }, [editor, contentKey]); // eslint-disable-line react-hooks/exhaustive-deps -- reload when note changes

  if (!editor) return null;

  return (
    <div className={className}>
      {showBubbleMenu ? <EditorBubbleMenu editor={editor} extraActions={bubbleMenuActions} /> : null}
      <EditorContent editor={editor} className={contentClassName} />
    </div>
  );
}
