import { useState, type ReactNode } from "react";
import { ChevronRight, List, Terminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SpriteWorkingMark } from "../SpriteWorkingMark";

export type AgentThoughtDuration = number | "brief";

export interface AgentThoughtBlockProps {
  duration?: AgentThoughtDuration;
  label?: string;
  defaultOpen?: boolean;
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
        {displayLabel}
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
    return <span className="arco-agent-todo__indicator arco-agent-todo__indicator--completed">✓</span>;
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
        <span>To-dos</span>
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
  className?: string;
}

/** Inline agent activity status (streaming, connecting, etc.). */
export function AgentStatusLine({ children, className = "" }: AgentStatusLineProps) {
  return (
    <div className={["arco-agent-status", className].filter(Boolean).join(" ")}>
      <SpriteWorkingMark />
      <span>{children}</span>
    </div>
  );
}
