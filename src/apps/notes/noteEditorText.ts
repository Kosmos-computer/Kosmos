import { exportDocToMarkdown } from "@arco/editor-kit";
import type { Editor } from "@tiptap/core";

/** Plain text for the current selection, or the full document when empty. */
export function getEditorSpeakText(editor: Editor): string {
  const { from, to } = editor.state.selection;
  if (from !== to) {
    return editor.state.doc.textBetween(from, to, "\n\n").trim();
  }
  return editor.getText().trim();
}

/** Markdown for the current selection, or the full note when empty. */
export function getEditorContextMarkdown(editor: Editor): string {
  const { from, to } = editor.state.selection;
  if (from !== to) {
    return editor.state.doc.textBetween(from, to, "\n\n").trim();
  }
  return exportDocToMarkdown(editor.getJSON()).trim();
}

export function hasEditorSelection(editor: Editor): boolean {
  const { from, to } = editor.state.selection;
  return from !== to;
}
