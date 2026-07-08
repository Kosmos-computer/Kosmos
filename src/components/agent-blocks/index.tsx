import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, List, Terminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SpriteWorkingMark } from "../SpriteWorkingMark";
import type { SpriteMarkStatus } from "../sprite-mark";

/** "37m 47s" below an hour, "1h 02m" at/above it, "8s" under a minute. */
function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/** "6.0k tokens" above 1000, plain count below. */
function formatTokenCount(tokens: number): string {
  const label = tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);
  return `${label} token${tokens === 1 ? "" : "s"}`;
}

export interface TurnMeterProps {
  /** Turn start time, as returned by Date.now(). */
  startedAt: number;
  totalTokens: number;
  className?: string;
}

/** Live "37m 47s · 6.0k tokens" readout — ticks every second while mounted. */
export function TurnMeter({ startedAt, totalTokens, className = "" }: TurnMeterProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={["arco-agent-turnmeter", className].filter(Boolean).join(" ")}>
      {formatElapsed(now - startedAt)}
      {totalTokens > 0 ? ` · ${formatTokenCount(totalTokens)}` : ""}
    </span>
  );
}

export type AgentThoughtDuration = number | "brief";

export interface AgentThoughtBlockProps {
  duration?: AgentThoughtDuration;
  label?: string;
  defaultOpen?: boolean;
  /** Rendered at the right edge of the trigger row (e.g. a live TurnMeter). */
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}

function formatThoughtLabel(duration?: AgentThoughtDuration): string {
  if (duration === "brief") return "Thought briefly";
  if (duration !== undefined && duration > 0) return `Thought for ${duration}s`;
  return "Thinking";
}

/** Collapsible reasoning trace. */
export function AgentThoughtBlock({
  duration,
  label,
  defaultOpen = true,
  meta,
  children,
  className = "",
}: AgentThoughtBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const displayLabel = label ?? formatThoughtLabel(duration);

  return (
    <div className={["arco-agent-thought", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        className="arco-agent-thought__trigger"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <ChevronRight
          size={13}
          className={[
            "arco-agent-thought__chevron",
            open ? "arco-agent-thought__chevron--open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
        <span className="arco-agent-thought__label">{displayLabel}</span>
        {meta ? <span className="arco-agent-thought__meta">{meta}</span> : null}
      </button>
      {open ? <div className="arco-agent-thought__body">{children}</div> : null}
    </div>
  );
}

export interface AgentActionBlockProps {
  title: string;
  command?: string;
  output: string | string[];
  icon?: LucideIcon;
  defaultOpen?: boolean;
  className?: string;
}

/** Tool-call output card with collapsible monospace body. */
export function AgentActionBlock({
  title,
  command,
  output,
  icon: Icon = Terminal,
  defaultOpen = true,
  className = "",
}: AgentActionBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const text = Array.isArray(output) ? output.join("\n") : output;

  return (
    <div className={["arco-agent-action", className].filter(Boolean).join(" ")} role="group">
      <button
        type="button"
        className="arco-agent-action__header"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="arco-agent-action__icon" aria-hidden="true">
          <Icon size={14} />
        </span>
        <span className="arco-agent-action__title">{title}</span>
        {command ? <code className="arco-agent-action__command">{command}</code> : null}
        <ChevronRight
          size={13}
          className={[
            "arco-agent-action__chevron",
            open ? "arco-agent-action__chevron--open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </button>
      {open ? (
        <div className="arco-agent-action__body">
          <pre className="arco-agent-action__output">{text}</pre>
        </div>
      ) : null}
    </div>
  );
}

export type AgentTodoStatus = "pending" | "active" | "completed";

export interface AgentTodoItem {
  id: string;
  label: string;
  status: AgentTodoStatus;
}

export interface AgentTodoCardProps {
  items: AgentTodoItem[];
  className?: string;
}

function TodoIndicator({ status }: { status: AgentTodoStatus }) {
  if (status === "completed") {
    return (
      <span className="arco-agent-todo__indicator arco-agent-todo__indicator--completed">
        {"\u2713"}
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="arco-agent-todo__indicator arco-agent-todo__indicator--active">
        <ChevronRight size={12} />
      </span>
    );
  }
  return <span className="arco-agent-todo__indicator" />;
}

/** Agent plan card with active, pending, and completed task rows. */
export function AgentTodoCard({ items, className = "" }: AgentTodoCardProps) {
  return (
    <div
      className={["arco-agent-todo", className].filter(Boolean).join(" ")}
      role="group"
      aria-label={`To-dos ${items.length}`}
    >
      <div className="arco-agent-todo__header">
        <List size={14} aria-hidden="true" />
        <span><T k={I18nKey.COMPONENTS$AGENT_BLOCKS_TO_DOS} /></span>
        <span className="arco-agent-todo__count">{items.length}</span>
      </div>
      <ul className="arco-agent-todo__list">
        {items.map((item) => (
          <li
            key={item.id}
            className={[
              "arco-agent-todo__row",
              item.status === "pending" ? "arco-agent-todo__row--pending" : "",
              item.status === "completed" ? "arco-agent-todo__row--completed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <TodoIndicator status={item.status} />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface AgentStatusLineProps {
  children: ReactNode;
  /** Rendered at the right edge (e.g. a live TurnMeter). */
  meta?: ReactNode;
  className?: string;
  /** Sprite mark status — working, thinking, success, etc. */
  markStatus?: SpriteMarkStatus;
  /** Spell a short status label on the sprite mark (e.g. "OK", "HI"). */
  markText?: string;
  /** Emoji / emoticon on the sprite mark (e.g. "✨", ":)"). */
  markEmoji?: string;
}

/** Inline agent activity status (streaming, connecting, etc.). */
export function AgentStatusLine({
  children,
  meta,
  className = "",
  markStatus = "working",
  markText,
  markEmoji,
}: AgentStatusLineProps) {
  return (
    <div className={["arco-agent-status", className].filter(Boolean).join(" ")}>
      <SpriteWorkingMark status={markStatus} text={markText} emoji={markEmoji} />
      <span className="arco-agent-status__label">{children}</span>
      {meta ? <span className="arco-agent-status__meta">{meta}</span> : null}
    </div>
  );
}
