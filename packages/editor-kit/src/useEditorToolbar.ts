import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";

export type BlockFormat = "paragraph" | "heading1" | "heading2" | "heading3";
export type TextMark = "bold" | "italic" | "underline" | "strikethrough" | "code";
export type TextAlign = "left" | "center" | "right";

export interface EditorToolbarState {
  blockFormat: BlockFormat;
  marks: TextMark[];
  align: TextAlign;
  canUndo: boolean;
  canRedo: boolean;
}

function blockFormatFromEditor(editor: Editor): BlockFormat {
  if (editor.isActive("heading", { level: 1 })) return "heading1";
  if (editor.isActive("heading", { level: 2 })) return "heading2";
  if (editor.isActive("heading", { level: 3 })) return "heading3";
  return "paragraph";
}

function marksFromEditor(editor: Editor): TextMark[] {
  const marks: TextMark[] = [];
  if (editor.isActive("bold")) marks.push("bold");
  if (editor.isActive("italic")) marks.push("italic");
  if (editor.isActive("underline")) marks.push("underline");
  if (editor.isActive("strike")) marks.push("strikethrough");
  if (editor.isActive("code")) marks.push("code");
  return marks;
}

function alignFromEditor(editor: Editor): TextAlign {
  if (editor.isActive({ textAlign: "center" })) return "center";
  if (editor.isActive({ textAlign: "right" })) return "right";
  return "left";
}

export function useEditorToolbar(editor: Editor | null, enabled = true): EditorToolbarState {
  const [state, setState] = useState<EditorToolbarState>({
    blockFormat: "paragraph",
    marks: [],
    align: "left",
    canUndo: false,
    canRedo: false,
  });

  useEffect(() => {
    if (!editor || !enabled) return;

    const sync = () => {
      setState({
        blockFormat: blockFormatFromEditor(editor),
        marks: marksFromEditor(editor),
        align: alignFromEditor(editor),
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
      });
    };

    editor.on("selectionUpdate", sync);
    editor.on("transaction", sync);
    sync();

    return () => {
      editor.off("selectionUpdate", sync);
      editor.off("transaction", sync);
    };
  }, [editor, enabled]);

  return state;
}

export function applyBlockFormat(editor: Editor, format: BlockFormat) {
  const chain = editor.chain().focus();
  switch (format) {
    case "heading1":
      chain.toggleHeading({ level: 1 });
      break;
    case "heading2":
      chain.toggleHeading({ level: 2 });
      break;
    case "heading3":
      chain.toggleHeading({ level: 3 });
      break;
    default:
      chain.setParagraph();
  }
  chain.run();
}

export function toggleTextMark(editor: Editor, mark: TextMark) {
  const chain = editor.chain().focus();
  switch (mark) {
    case "bold":
      chain.toggleBold();
      break;
    case "italic":
      chain.toggleItalic();
      break;
    case "underline":
      chain.toggleUnderline();
      break;
    case "strikethrough":
      chain.toggleStrike();
      break;
    case "code":
      chain.toggleCode();
      break;
  }
  chain.run();
}

export function setTextAlign(editor: Editor, align: TextAlign) {
  editor.chain().focus().setTextAlign(align).run();
}
