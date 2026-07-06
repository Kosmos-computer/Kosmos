/**
 * Timestamp + action rail shown under a chat bubble (user or assistant) —
 * ported from the longformer UI Experiments MessageBubble pattern. Copy and
 * (for assistant messages) Read aloud are wired up; the rest of the rail
 * (edit/restore for user, regenerate/feedback/share/fork for assistant) is
 * ghosted — visible for layout parity with the reference but disabled until
 * those flows exist. Both the timestamp and the action icons fade in on
 * hover/focus via the parent row's CSS (see .arco-chat__user-row /
 * .arco-chat__assistant).
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
}: {
  text: string;
  timestamp?: string;
  align: "start" | "end";
  variant: "user" | "assistant";
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — no-op.
    }
  };

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
        aria-label="Copy message"
        onClick={() => void copy()}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      {variant === "user" ? (
        <>
          <GhostAction label="Edit message" icon={Pencil} />
          <GhostAction label="Restore checkpoint" icon={Undo2} />
        </>
      ) : (
        <>
          <ReadAloudAction text={text} />
          <GhostAction label="Regenerate response" icon={RefreshCw} />
          <GhostAction label="Good response" icon={ThumbsUp} />
          <GhostAction label="Bad response" icon={ThumbsDown} />
          <GhostAction label="Share response" icon={Share2} />
          <GhostAction label="Fork conversation" icon={GitFork} />
        </>
      )}
    </div>
  );
}
