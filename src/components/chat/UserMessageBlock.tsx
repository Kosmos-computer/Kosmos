/**
 * User bubble with Edit / Restore checkpoint — Cursor + Claude Code patterns:
 * edit inline then confirm before resend; restore offers code+conversation,
 * conversation-only, or code-only after a confirmation window.
 */
import { useEffect, useRef, useState } from "react";
import type { ChatItem } from "../../apps/chat/useChat";
import { countItemsAfter, findUserMessageIndex } from "../../apps/chat/useChat";
import { api } from "../../lib/api";
import { Button } from "../ui";
import { ChatBubbleFooter } from "./ChatBubbleFooter";
import {
  ChatRewindConfirmModal,
  type ChatRestoreMode,
  type ChatRewindKind,
} from "./ChatRewindConfirmModal";

interface Props {
  item: Extract<ChatItem, { kind: "user" }>;
  items: ChatItem[];
  sessionId?: string;
  disabled?: boolean;
  onEditAndResend?: (item: Extract<ChatItem, { kind: "user" }>, text: string) => void | Promise<void>;
  onRestoreCheckpoint?: (
    item: Extract<ChatItem, { kind: "user" }>,
    mode: ChatRestoreMode,
  ) => void | Promise<string | null>;
  /** After restore, load the prompt into the composer (Claude Code behavior). */
  onPrimeComposer?: (text: string) => void;
}

export function UserMessageBlock({
  item,
  items,
  sessionId,
  disabled = false,
  onEditAndResend,
  onRestoreCheckpoint,
  onPrimeComposer,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const [confirm, setConfirm] = useState<ChatRewindKind | null>(null);
  const [fileEditCount, setFileEditCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  const discardForRestore = countItemsAfter(items, item.id);

  const beginEdit = () => {
    setDraft(item.text);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(item.text);
    setConfirm(null);
  };

  const openRestoreConfirm = () => {
    setConfirm("restore");
    setFileEditCount(0);
    if (!sessionId) return;
    void api
      .getSession(sessionId)
      .then(async (session) => {
        const idx = findUserMessageIndex(session, item, items);
        const { editCount } = await api.checkpointEditCount(sessionId, idx);
        setFileEditCount(editCount);
      })
      .catch(() => setFileEditCount(0));
  };

  const runEdit = async () => {
    if (!onEditAndResend) return;
    setBusy(true);
    try {
      await onEditAndResend(item, draft);
      setEditing(false);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const runRestore = async (mode: ChatRestoreMode = "both") => {
    if (!onRestoreCheckpoint) return;
    setBusy(true);
    try {
      const text = await onRestoreCheckpoint(item, mode);
      setConfirm(null);
      if (text != null) onPrimeComposer?.(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="arco-chat__user-row">
      {editing ? (
        <div className="arco-chat__user-edit">
          <textarea
            ref={textareaRef}
            className="arco-chat__user-edit-input"
            value={draft}
            rows={Math.min(8, Math.max(2, draft.split("\n").length))}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setConfirm("edit");
              }
            }}
            disabled={busy}
            aria-label="Edit message"
          />
          <div className="arco-chat__user-edit-actions">
            <Button onClick={cancelEdit} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => setConfirm("edit")}
              disabled={busy || !draft.trim()}
            >
              Resend
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="arco-chat__user">{item.text}</div>
          <ChatBubbleFooter
            text={item.text}
            timestamp={item.timestamp}
            align="end"
            variant="user"
            onEdit={disabled || !onEditAndResend ? undefined : beginEdit}
            onRestore={
              disabled || !onRestoreCheckpoint ? undefined : openRestoreConfirm
            }
          />
        </>
      )}

      <ChatRewindConfirmModal
        open={confirm != null}
        kind={confirm ?? "restore"}
        discardCount={discardForRestore}
        fileEditCount={fileEditCount}
        previewText={confirm === "edit" ? draft : item.text}
        busy={busy}
        onCancel={() => {
          if (!busy) setConfirm(null);
        }}
        onConfirm={(mode) => {
          if (confirm === "edit") void runEdit();
          else void runRestore(mode ?? "both");
        }}
      />
    </div>
  );
}
