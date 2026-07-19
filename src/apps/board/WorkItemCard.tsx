import type { DragEvent } from "react";
import {
  GitBranch,
  MessageSquare,
  MoreHorizontal,
  Play,
  Trash2,
} from "lucide-react";
import type { LinkedSessionView, SessionRunState, WorkItem } from "./types";
import { SESSION_RUN_LABEL } from "./types";

function runClass(state: SessionRunState): string {
  return `arco-board__run arco-board__run--${state}`;
}

export interface WorkItemCardProps {
  item: WorkItem;
  sessions: LinkedSessionView[];
  selected?: boolean;
  compact?: boolean;
  onSelect: (id: string) => void;
  onOpenStudio: (item: WorkItem, sessionId?: string) => void;
  onStartAgent: (item: WorkItem) => void;
  onDelete?: (id: string) => void;
  dragHandlers?: {
    draggable: boolean;
    onDragStart: (event: DragEvent) => void;
    onDragEnd: (event: DragEvent) => void;
  };
}

export function WorkItemCard({
  item,
  sessions,
  selected,
  compact,
  onSelect,
  onOpenStudio,
  onStartAgent,
  onDelete,
  dragHandlers,
}: WorkItemCardProps) {
  return (
    <article
      className={[
        "arco-board__card",
        selected ? "arco-board__card--selected" : "",
        compact ? "arco-board__card--compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onSelect(item.id)}
      {...dragHandlers}
    >
      <div className="arco-board__card-top">
        <h3 className="arco-board__card-title">{item.title}</h3>
        <div className="arco-board__card-menu">
          <button
            type="button"
            className="arco-btn arco-btn--ghost arco-btn--icon"
            aria-label="Start agent"
            title="Start agent"
            onClick={(event) => {
              event.stopPropagation();
              onStartAgent(item);
            }}
          >
            <Play size={12} />
          </button>
          {onDelete ? (
            <button
              type="button"
              className="arco-btn arco-btn--ghost arco-btn--icon"
              aria-label="Delete work item"
              title="Delete"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(item.id);
              }}
            >
              <Trash2 size={12} />
            </button>
          ) : (
            <MoreHorizontal size={12} className="arco-board__card-more" aria-hidden />
          )}
        </div>
      </div>

      {!compact && item.description ? (
        <p className="arco-board__card-desc">{item.description}</p>
      ) : null}

      <div className="arco-board__card-meta">
        {item.branch || item.worktreePath ? (
          <span className="arco-board__pill" title={item.worktreePath ?? item.branch ?? undefined}>
            <GitBranch size={11} />
            {item.branch ?? item.worktreePath?.split("/").pop() ?? "worktree"}
          </span>
        ) : null}
        {item.assignee ? (
          <span className="arco-board__pill">{item.assignee.name}</span>
        ) : null}
        {item.priority ? (
          <span className={`arco-board__pill arco-board__pill--${item.priority}`}>
            {item.priority}
          </span>
        ) : null}
      </div>

      {sessions.length > 0 ? (
        <ul className="arco-board__sessions">
          {sessions.map((session) => (
            <li key={session.id}>
              <button
                type="button"
                className="arco-board__session"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenStudio(item, session.id);
                }}
              >
                <MessageSquare size={11} />
                <span className="arco-board__session-title">{session.title}</span>
                <span className={runClass(session.runState)}>
                  {SESSION_RUN_LABEL[session.runState]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <button
          type="button"
          className="arco-board__session arco-board__session--empty"
          onClick={(event) => {
            event.stopPropagation();
            onOpenStudio(item);
          }}
        >
          <MessageSquare size={11} />
          Open in Studio
        </button>
      )}
    </article>
  );
}
