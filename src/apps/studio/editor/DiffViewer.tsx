/**
 * DiffViewer — read-only Monaco diff with line-comment annotations.
 * Click a gutter line on the modified side to leave a review note for the agent.
 */
import { DiffEditor, type DiffOnMount } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import type * as Monaco from "monaco-editor";
import { MessageSquarePlus, Send, Trash2 } from "lucide-react";
import { formatDiffComments } from "@shared/diffComments";
import { primeComposer } from "../../chat/composerBus";
import { languageForPath } from "./monacoSetup";
import { useDiffCommentsStore } from "../diffCommentsStore";

interface Props {
  path: string;
  before: string | null;
  after: string;
  theme: "light" | "dark";
}

export default function DiffViewer({ path, before, after, theme }: Props) {
  const modifiedEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const decoIdsRef = useRef<string[]>([]);
  const [draftLine, setDraftLine] = useState<number | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const comments = useDiffCommentsStore((s) => s.comments);
  const addComment = useDiffCommentsStore((s) => s.addComment);
  const removeComment = useDiffCommentsStore((s) => s.removeComment);
  const markAllSent = useDiffCommentsStore((s) => s.markAllSent);
  const pending = comments.filter((c) => c.filePath === path && !c.sentAt);
  const pendingAll = comments.filter((c) => !c.sentAt);
  const pendingKey = pending.map((c) => `${c.id}:${c.lineNumber}`).join("|");

  useEffect(() => {
    const editor = modifiedEditorRef.current;
    if (!editor) return;
    const lines = pending.map((c) => c.lineNumber).filter((n) => n > 0);
    decoIdsRef.current = editor.deltaDecorations(
      decoIdsRef.current,
      lines.map((line) => ({
        range: {
          startLineNumber: line,
          startColumn: 1,
          endLineNumber: line,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: "arco-diff-comment-line",
          glyphMarginClassName: "arco-diff-comment-glyph",
        },
      })),
    );
    // pendingKey captures comment identity without a fresh array dep each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pending derived from pendingKey
  }, [pendingKey, path, after]);

  const onMount: DiffOnMount = (editor, monaco) => {
    const modified = editor.getModifiedEditor();
    modifiedEditorRef.current = modified;
    modified.updateOptions({ glyphMargin: true, lineNumbers: "on" });
    modified.onMouseDown((e) => {
      const t = e.target.type;
      if (
        t === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        t === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
        t === monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS
      ) {
        const line = e.target.position?.lineNumber;
        if (line) {
          setDraftLine(line);
          setDraftBody("");
        }
      }
    });
  };

  const submitDraft = () => {
    if (draftLine == null || !draftBody.trim()) return;
    addComment(path, draftLine, draftBody);
    setDraftLine(null);
    setDraftBody("");
  };

  const sendToAgent = () => {
    const text = formatDiffComments(pendingAll);
    if (!text) return;
    primeComposer({ text, submit: false });
    markAllSent();
  };

  return (
    <div className="arco-diff-viewer">
      <div className="arco-diff-viewer__toolbar">
        <button
          type="button"
          className="arco-btn arco-btn--ghost"
          title="Add a file-scope note"
          onClick={() => {
            setDraftLine(0);
            setDraftBody("");
          }}
        >
          <MessageSquarePlus size={12} />
          Comment
        </button>
        {pendingAll.length > 0 && (
          <button type="button" className="arco-btn arco-btn--primary" onClick={sendToAgent}>
            <Send size={12} />
            Send {pendingAll.length} note{pendingAll.length === 1 ? "" : "s"} to agent
          </button>
        )}
      </div>

      {draftLine !== null && (
        <div className="arco-diff-viewer__draft">
          <label>
            {draftLine === 0 ? "File note" : `Line ${draftLine}`}
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={2}
              placeholder="What should the agent change?"
              autoFocus
            />
          </label>
          <div className="arco-diff-viewer__draft-actions">
            <button
              type="button"
              className="arco-btn arco-btn--primary"
              disabled={!draftBody.trim()}
              onClick={submitDraft}
            >
              Add note
            </button>
            <button type="button" className="arco-btn" onClick={() => setDraftLine(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <ul className="arco-diff-viewer__notes">
          {pending.map((c) => (
            <li key={c.id}>
              <span>
                {c.lineNumber === 0 ? "File" : `L${c.lineNumber}`}: {c.body}
              </span>
              <button
                type="button"
                className="arco-btn arco-btn--icon"
                aria-label="Remove note"
                onClick={() => removeComment(c.id)}
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Explicit 100% height — Monaco collapses to 0 inside nested flex without it. */}
      <div className="arco-diff-viewer__editor">
        <DiffEditor
          height="100%"
          original={before ?? ""}
          modified={after}
          language={languageForPath(path)}
          theme={theme === "dark" ? "arco-dark" : "arco-light"}
          onMount={onMount}
          options={{
            readOnly: true,
            renderSideBySide: false,
            fontSize: 12,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            lineNumbers: "on",
            glyphMargin: true,
            folding: false,
            renderOverviewRuler: false,
          }}
        />
      </div>
    </div>
  );
}
