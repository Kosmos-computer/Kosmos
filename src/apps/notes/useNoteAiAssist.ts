import { useCallback, useRef, useState } from "react";
import { importMarkdownToDoc } from "@arco/editor-kit";
import type { Editor } from "@tiptap/core";
import { streamChat } from "../../lib/api";
import { useOsStore } from "../../os/osStore";
import { getEditorContextMarkdown, hasEditorSelection } from "./noteEditorText";

export type NoteAiApplyMode = "selection" | "insert" | "document";

function stripResponseMarkdown(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:markdown|md)?\s*([\s\S]*?)```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function buildPrompt(context: string, instruction: string, mode: NoteAiApplyMode): string {
  const modeHint =
    mode === "selection"
      ? "Return only the replacement for the selected passage."
      : mode === "insert"
        ? "Return only the new content to insert at the cursor."
        : "Return the full updated note body.";

  return [
    "You help edit notes in markdown.",
    "Use headings, lists, blockquotes, and code blocks when helpful.",
    "For rich UI blocks, use fenced ```widget blocks with JSON { type, version, props }.",
    modeHint,
    "Reply with markdown only — no preamble or explanation.",
    "",
    context ? `Current note:\n${context}` : "The note is currently empty.",
    "",
    `Instruction: ${instruction.trim()}`,
  ].join("\n");
}

function applyMarkdownToEditor(editor: Editor, markdown: string, mode: NoteAiApplyMode) {
  const doc = importMarkdownToDoc(markdown);
  const content = doc.content ?? [];

  if (mode === "document") {
    editor.commands.setContent(doc, true);
    return;
  }

  const chain = editor.chain().focus();
  if (mode === "selection" && hasEditorSelection(editor)) {
    chain.deleteSelection();
  }
  chain.insertContent(content).run();
}

export function useNoteAiAssist(editor: Editor | null) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [applyMode, setApplyMode] = useState<NoteAiApplyMode>("selection");
  const abortRef = useRef<AbortController | null>(null);
  const notify = useOsStore((s) => s.notify);

  const openComposer = useCallback(
    (preferredMode?: NoteAiApplyMode) => {
      if (!editor) return;
      setApplyMode(
        preferredMode ?? (hasEditorSelection(editor) ? "selection" : "document"),
      );
      setOpen(true);
    },
    [editor],
  );

  const closeComposer = useCallback(() => {
    if (streaming) {
      abortRef.current?.abort();
      abortRef.current = null;
      setStreaming(false);
    }
    setOpen(false);
    setPrompt("");
  }, [streaming]);

  const submit = useCallback(async () => {
    if (!editor || streaming || !prompt.trim()) return;

    const instruction = prompt.trim();
    const context = getEditorContextMarkdown(editor);
    const message = buildPrompt(context, instruction, applyMode);
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);

    let response = "";
    try {
      await streamChat(
        message,
        undefined,
        (event) => {
          if (event.type === "text_delta") response += event.delta;
        },
        controller.signal,
        "ask",
      );

      const markdown = stripResponseMarkdown(response);
      if (!markdown) {
        notify("The assistant did not return any content to insert.");
        return;
      }

      applyMarkdownToEditor(editor, markdown, applyMode);
      setPrompt("");
      setOpen(false);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.error("Note AI assist failed:", err);
        notify("AI assist failed — check that the agent server is running.");
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  }, [applyMode, editor, notify, prompt, streaming]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  return {
    open,
    prompt,
    streaming,
    applyMode,
    setPrompt,
    setApplyMode,
    openComposer,
    closeComposer,
    submit,
    stop,
  };
}
