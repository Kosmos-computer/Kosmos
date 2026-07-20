/**
 * ConversationStatusDot — left-rail indicator:
 * check = just finished (settles to idle), grey spinner = running,
 * grey = idle, green = waiting, yellow = paused, red = error.
 */
import type { ConversationExecutionStatus } from "./conversationStatusStore";

type Visual = "check" | "spinner" | "idle" | "waiting" | "paused" | "error";

function visualFor(status: ConversationExecutionStatus): Visual {
  switch (status) {
    case "finished":
      return "check";
    case "running":
      return "spinner";
    case "waiting":
      return "waiting";
    case "paused":
      return "paused";
    case "error":
      return "error";
    case "idle":
    default:
      return "idle";
  }
}

function labelFor(status: ConversationExecutionStatus): string {
  switch (status) {
    case "finished":
      return "Finished";
    case "running":
      return "Working";
    case "waiting":
      return "Waiting for confirmation";
    case "paused":
      return "Paused";
    case "error":
      return "Error";
    case "idle":
    default:
      return "Idle";
  }
}

function StatusIndicator({ visual }: { visual: Visual }) {
  switch (visual) {
    case "check":
      return (
        <svg
          className="arco-conversation-status-dot__check"
          viewBox="0 0 12 12"
          fill="none"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2.5 6.5 5 9l4.5-5.5" />
        </svg>
      );
    case "spinner":
      return (
        <span className="arco-conversation-status-dot__spinner" aria-hidden="true" />
      );
    case "idle":
      return (
        <span
          className="arco-conversation-status-dot__blob arco-conversation-status-dot__blob--idle"
          aria-hidden="true"
        />
      );
    case "waiting":
      return (
        <span
          className="arco-conversation-status-dot__blob arco-conversation-status-dot__blob--waiting"
          aria-hidden="true"
        />
      );
    case "paused":
      return (
        <span
          className="arco-conversation-status-dot__blob arco-conversation-status-dot__blob--paused"
          aria-hidden="true"
        />
      );
    case "error":
      return (
        <span
          className="arco-conversation-status-dot__blob arco-conversation-status-dot__blob--error"
          aria-hidden="true"
        />
      );
  }
}

export function ConversationStatusDot({
  status,
}: {
  status: ConversationExecutionStatus;
}) {
  const visual = visualFor(status);
  const label = labelFor(status);

  return (
    <span
      className="arco-conversation-status-dot"
      title={label}
      aria-label={label}
    >
      <StatusIndicator visual={visual} />
    </span>
  );
}
