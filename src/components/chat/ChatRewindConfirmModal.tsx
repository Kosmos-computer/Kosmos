/**
 * Confirmation dialog for destructive conversation rewinds and checkpoint restore.
 * Restore can rewind conversation, tracked file edits, or both.
 */
import { Button } from "../ui";

export type ChatRewindKind = "edit" | "restore";
export type ChatRestoreMode = "both" | "conversation" | "code";

export interface ChatRewindConfirmModalProps {
  open: boolean;
  kind: ChatRewindKind;
  /** How many thread items will be discarded after the chosen message. */
  discardCount: number;
  /** Tracked agent file edits that would be reverted (restore only). */
  fileEditCount?: number;
  /** Preview of the prompt being edited/restored. */
  previewText: string;
  busy?: boolean;
  onCancel: () => void;
  /** Edit resend, or restore with an explicit mode. */
  onConfirm: (mode?: ChatRestoreMode) => void;
}

export function ChatRewindConfirmModal({
  open,
  kind,
  discardCount,
  fileEditCount = 0,
  previewText,
  busy = false,
  onCancel,
  onConfirm,
}: ChatRewindConfirmModalProps) {
  if (!open) return null;

  const title = kind === "edit" ? "Resend from here?" : "Restore checkpoint?";
  const discardLabel =
    discardCount === 0
      ? "No later messages will be removed."
      : discardCount === 1
        ? "1 later message will be removed from this chat."
        : `${discardCount} later messages will be removed from this chat.`;

  const fileLabel =
    fileEditCount === 0
      ? "No workspace file edits from the agent after this point."
      : fileEditCount === 1
        ? "1 file edit from the agent will be reverted."
        : `${fileEditCount} file edits from the agent will be reverted.`;

  const body =
    kind === "edit"
      ? "This replaces the prompt and continues from here. Workspace files stay as they are."
      : "Choose what to rewind from this message.";

  const preview =
    previewText.length > 180 ? `${previewText.slice(0, 180).trimEnd()}…` : previewText;

  return (
    <div className="arco-task-modal__backdrop" role="presentation" onClick={onCancel}>
      <div
        className="arco-task-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="chat-rewind-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="arco-task-modal__header">
          <div className="arco-task-modal__title-row">
            <h2 id="chat-rewind-title">{title}</h2>
          </div>
        </header>
        <div className="arco-task-modal__body">
          <p style={{ margin: 0, fontSize: "var(--arco-text-sm)" }}>{body}</p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--arco-text-sm)",
              fontWeight: 600,
              color: "var(--arco-danger, var(--arco-text-primary))",
            }}
          >
            {discardLabel}
          </p>
          {kind === "restore" ? (
            <p style={{ margin: 0, fontSize: "var(--arco-text-sm)", fontWeight: 600 }}>
              {fileLabel}
            </p>
          ) : null}
          {preview ? (
            <div className="arco-task-modal__section">
              <p className="arco-task-modal__label">Message</p>
              <p
                style={{
                  margin: 0,
                  padding: "10px 12px",
                  borderRadius: "var(--arco-radius-m)",
                  background: "var(--arco-bg-muted)",
                  fontSize: "var(--arco-text-sm)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {preview}
              </p>
            </div>
          ) : null}
        </div>
        <footer
          className="arco-task-modal__footer"
          style={
            kind === "restore"
              ? { flexWrap: "wrap", justifyContent: "stretch" }
              : undefined
          }
        >
          <Button onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          {kind === "edit" ? (
            <Button variant="danger" onClick={() => onConfirm()} disabled={busy}>
              {busy ? "Working…" : "Resend"}
            </Button>
          ) : (
            <>
              <Button
                onClick={() => onConfirm("conversation")}
                disabled={busy}
                title="Rewind chat only — keep current files"
              >
                Conversation only
              </Button>
              {fileEditCount > 0 ? (
                <Button
                  onClick={() => onConfirm("code")}
                  disabled={busy}
                  title="Revert tracked file edits — keep chat history"
                >
                  Code only
                </Button>
              ) : null}
              <Button
                variant="danger"
                onClick={() => onConfirm("both")}
                disabled={busy}
                title="Revert tracked file edits and rewind the chat"
              >
                {busy ? "Working…" : "Code and conversation"}
              </Button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
