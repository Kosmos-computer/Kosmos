/**
 * ConfirmCard — inline Allow/Deny prompt for a risky exec command the server
 * has paused. Answering POSTs the verdict; the card then reflects the
 * resolution streamed back via confirm_resolved (or times out server-side
 * to deny after two minutes).
 */
import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import type { ChatItem } from "./useChat";
import { api } from "../../lib/api";

type ConfirmItem = Extract<ChatItem, { kind: "confirm" }>;

export function ConfirmCard({ item }: { item: ConfirmItem }) {
  const [answering, setAnswering] = useState(false);
  const pending = item.approved === undefined;

  const answer = async (approved: boolean) => {
    setAnswering(true);
    try {
      await api.answerConfirmation(item.confirmId, approved);
    } finally {
      setAnswering(false);
    }
  };

  return (
    <div className={`arco-confirm ${pending ? "arco-confirm--pending" : ""}`}>
      <div className="arco-confirm__row">
        <ShieldAlert size={14} className="arco-confirm__icon" />
        <span className="arco-confirm__label">
          {pending ? "The agent wants to run:" : item.approved ? "Approved:" : "Denied:"}
        </span>
      </div>
      <code className="arco-confirm__command">{item.command}</code>
      {pending && (
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
    </div>
  );
}
