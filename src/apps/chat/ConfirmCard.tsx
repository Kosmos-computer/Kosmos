/**
 * ConfirmCard — inline approval prompt for a paused server-side action.
 * Two flavors share this card:
 *   - risky exec commands: plain Allow / Deny, decided per invocation
 *   - policy-gated tools (MCP/app tools): extended choices — allow once,
 *     allow for this session, always allow (persists a policy rule), deny
 * Answering POSTs the verdict; the card then reflects the resolution
 * streamed back via confirm_resolved (or times out server-side to deny).
 */
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import type { ConfirmOption } from "@shared/types";
import { api } from "../../lib/api";

/** The subset of a confirm chat item this card needs — also satisfied by
 *  desktop-level ShellConfirm cards (voice-turn approvals). */
export interface ConfirmCardData {
  confirmId: string;
  command: string;
  approved?: boolean;
  options?: ConfirmOption[];
}

export function ConfirmCard({ item }: { item: ConfirmCardData }) {
  const [answering, setAnswering] = useState(false);
  const pending = item.approved === undefined;
  const extended = (item.options?.length ?? 0) > 0;

  const answer = async (approved: boolean, remember?: "session" | "always") => {
    setAnswering(true);
    try {
      await api.answerConfirmation(item.confirmId, approved, remember);
    } finally {
      setAnswering(false);
    }
  };

  return (
    <div className={`arco-confirm ${pending ? "arco-confirm--pending" : ""}`}>
      <div className="arco-confirm__row">
        <ShieldAlert size={14} className="arco-confirm__icon" />
        <span className="arco-confirm__label">
          {pending
            ? extended
              ? "The agent wants to use a tool:"
              : "The agent wants to run:"
            : item.approved
              ? "Approved:"
              : "Denied:"}
        </span>
      </div>
      <code className="arco-confirm__command">{item.command}</code>
      {pending && !extended && (
        <div className="arco-confirm__actions">
          <button
            className="arco-btn arco-btn--primary"
            disabled={answering}
            onClick={() => void answer(true)}
          >
            Allow
          </button>
          <button className="arco-btn" disabled={answering} onClick={() => void answer(false)}>
            Deny
          </button>
        </div>
      )}
      {pending && extended && (
        <div className="arco-confirm__actions">
          <button
            className="arco-btn arco-btn--primary"
            disabled={answering}
            onClick={() => void answer(true)}
          >
            Allow once
          </button>
          <button
            className="arco-btn"
            disabled={answering}
            onClick={() => void answer(true, "session")}
          >
            Allow this session
          </button>
          <button
            className="arco-btn"
            disabled={answering}
            onClick={() => void answer(true, "always")}
          >
            Always allow
          </button>
          <button className="arco-btn" disabled={answering} onClick={() => void answer(false)}>
            Deny
          </button>
        </div>
      )}
    </div>
  );
}
