import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
/**
 * Timestamp + action rail shown under a chat bubble (user or assistant) —
 * ported from the longformer UI Experiments MessageBubble pattern. Copy,
 * edit, restore (with redo-until-send), read aloud, regenerate, and fork
 * are wired; feedback/share stay ghosted until those flows exist.
 * Timestamp + icons fade in on hover/focus via the parent row's CSS.
 */
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  GitFork,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  Share2,
  Square,
  ThumbsDown,
  ThumbsUp,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { speak } from "../../voice/textToSpeech";
import { useOsStore } from "../../os/osStore";

type SpeechStatus = "idle" | "loading" | "playing";

function ReadAloudAction({ text }: { text: string }) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const stopRef = useRef<(() => void) | null>(null);
  const notify = useOsStore((s) => s.notify);

  useEffect(() => () => stopRef.current?.(), []);

  const toggle = () => {
    if (status !== "idle") {
      stopRef.current?.();
      setStatus("idle");
      return;
    }
    setStatus("loading");
    stopRef.current = speak(text, {
      onStart: () => setStatus("playing"),
      onEnd: () => setStatus("idle"),
      onError: (err) => {
        setStatus("idle");
        console.error("Read aloud failed:", err);
        notify("Read aloud failed — is the voice server running? (npm run voice)");
      },
    });
  };

  const label = status === "idle" ? "Read aloud" : "Stop reading";
  return (
    <button
      type="button"
      className="arco-chat__bubble-action"
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      {status === "loading" ? (
        <Loader2 size={13} className="arco-spin" />
      ) : status === "playing" ? (
        <Square size={13} />
      ) : (
        <Play size={13} />
      )}
    </button>
  );
}

function GhostAction({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <button
      type="button"
      className="arco-chat__bubble-action arco-chat__bubble-action--ghost"
      aria-label={label}
      title={`${label} — coming soon`}
      disabled
    >
      <Icon size={13} />
    </button>
  );
}

export function ChatBubbleFooter({
  text,
  timestamp,
  align,
  variant,
  onFork,
  onRegenerate,
  onEdit,
  onRestore,
}: {
  text: string;
  timestamp?: string;
  align: "start" | "end";
  variant: "user" | "assistant";
  /** Branch into a new chat with history through this message. */
  onFork?: () => void | Promise<void>;
  /** Drop this reply and resubmit the preceding user prompt. */
  onRegenerate?: () => void | Promise<void>;
  /** Enter inline edit mode for this user message. */
  onEdit?: () => void;
  /** Open restore-checkpoint confirmation for this user message. */
  onRestore?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [forking, setForking] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — no-op.
    }
  };

  const forkLabel = i18n.t(I18nKey.COMPONENTS$CHAT_FORK_CONVERSATION);
  const regenerateLabel = i18n.t(I18nKey.COMPONENTS$CHAT_REGENERATE_RESPONSE);
  const editLabel = i18n.t(I18nKey.COMPONENTS$CHAT_EDIT_MESSAGE);
  const restoreLabel = i18n.t(I18nKey.COMPONENTS$CHAT_RESTORE_CHECKPOINT);

  return (
    <div className={`arco-chat__footer arco-chat__footer--${align}`}>
      {timestamp && (
        <span className="arco-chat__timestamp">
          {new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </span>
      )}
      <button
        type="button"
        className="arco-chat__bubble-action"
        aria-label={i18n.t(I18nKey.COMPONENTS$CHAT_COPY_MESSAGE)}
        onClick={() => void copy()}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      {variant === "user" ? (
        <>
          {onEdit ? (
            <button
              type="button"
              className="arco-chat__bubble-action"
              aria-label={editLabel}
              title={editLabel}
              onClick={onEdit}
            >
              <Pencil size={13} />
            </button>
          ) : (
            <GhostAction label={editLabel} icon={Pencil} />
          )}
          {onRestore ? (
            <button
              type="button"
              className="arco-chat__bubble-action"
              aria-label={restoreLabel}
              title={restoreLabel}
              onClick={onRestore}
            >
              <Undo2 size={13} />
            </button>
          ) : (
            <GhostAction label={restoreLabel} icon={Undo2} />
          )}
        </>
      ) : (
        <>
          <ReadAloudAction text={text} />
          {onRegenerate ? (
            <button
              type="button"
              className="arco-chat__bubble-action"
              aria-label={regenerateLabel}
              title={regenerateLabel}
              disabled={regenerating}
              onClick={() => {
                setRegenerating(true);
                void Promise.resolve(onRegenerate()).finally(() => setRegenerating(false));
              }}
            >
              {regenerating ? <Loader2 size={13} className="arco-spin" /> : <RefreshCw size={13} />}
            </button>
          ) : (
            <GhostAction label={regenerateLabel} icon={RefreshCw} />
          )}
          <GhostAction label={i18n.t(I18nKey.COMPONENTS$CHAT_GOOD_RESPONSE)} icon={ThumbsUp} />
          <GhostAction label={i18n.t(I18nKey.COMPONENTS$CHAT_BAD_RESPONSE)} icon={ThumbsDown} />
          <GhostAction label={i18n.t(I18nKey.COMPONENTS$CHAT_SHARE_RESPONSE)} icon={Share2} />
          {onFork ? (
            <button
              type="button"
              className="arco-chat__bubble-action"
              aria-label={forkLabel}
              title={forkLabel}
              disabled={forking}
              onClick={() => {
                setForking(true);
                void Promise.resolve(onFork()).finally(() => setForking(false));
              }}
            >
              {forking ? <Loader2 size={13} className="arco-spin" /> : <GitFork size={13} />}
            </button>
          ) : (
            <GhostAction label={forkLabel} icon={GitFork} />
          )}
        </>
      )}
    </div>
  );
}
