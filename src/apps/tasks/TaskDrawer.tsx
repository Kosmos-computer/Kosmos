import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import {
  Archive,
  ArchiveRestore,
  Calendar,
  Check,
  Clock,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Badge, Button } from "../../components/ui";
import { TaskAssigneeMeta } from "./AssignToPicker";
import type { TaskHistoryEvent, TaskItem } from "./types";
import { TASK_HISTORY_ACTION_LABEL, TASK_STATUS_LABEL } from "./types";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDueDate(iso?: string, label?: string): string | null {
  if (label) return label;
  if (!iso) return null;
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function TaskHistoryList({
  events,
  emptyMessage = "No history yet.",
}: {
  events: TaskHistoryEvent[];
  emptyMessage?: string;
}) {
  if (events.length === 0) {
    return <p className="arco-task-history__empty">{emptyMessage}</p>;
  }

  return (
    <ul className="arco-task-history__list">
      {events.map((event) => (
        <li key={event.id} className="arco-task-history__item">
          <div className="arco-task-history__item-head">
            <strong>{TASK_HISTORY_ACTION_LABEL[event.action]}</strong>
            <time dateTime={event.timestamp}>{formatTimestamp(event.timestamp)}</time>
          </div>
          <div className="arco-task-history__item-body">
            <span className="arco-task-history__task-title">{event.taskTitle}</span>
            {event.detail ? <span className="arco-task-history__detail">{event.detail}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface TaskDrawerProps {
  task: TaskItem;
  history: TaskHistoryEvent[];
  onClose: () => void;
  onEdit: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskDrawer({
  task,
  history,
  onClose,
  onEdit,
  onToggleComplete,
  onArchive,
  onRestore,
  onDelete,
}: TaskDrawerProps) {
  const completed = task.status === "completed";
  const dueLabel = formatDueDate(task.dueDateISO, task.dueDate);
  const recentHistory = history.slice(0, 5);

  return (
    <div className="arco-task-drawer">
      <header className="arco-task-drawer__header">
        <div className="arco-task-drawer__header-main">
          <button
            type="button"
            className={[
              "arco-task-row__check",
              completed ? "arco-task-row__check--done" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={completed ? "Mark incomplete" : "Mark complete"}
            onClick={() => onToggleComplete(task.id)}
          >
            {completed ? <Check size={14} /> : null}
          </button>
          <h2 className="arco-task-drawer__title">{task.title}</h2>
        </div>
        <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onClose} aria-label={i18n.t(I18nKey.COMMON$CLOSE)}>
          <X size={16} />
        </button>
      </header>

      <div className="arco-task-drawer__body arco-scroll">
        <div className="arco-task-drawer__meta">
          <div className="arco-task-drawer__meta-row">
            <Clock size={14} aria-hidden />
            <span>{TASK_STATUS_LABEL[task.status]}</span>
            {task.archived ? <Badge tone="default"><T k={I18nKey.APPS$TASKS_ARCHIVED} /></Badge> : null}
          </div>
          {dueLabel ? (
            <div className="arco-task-drawer__meta-row">
              <Calendar size={14} aria-hidden />
              <span>{dueLabel}</span>
            </div>
          ) : null}
          {task.priority ? (
            <div className="arco-task-drawer__meta-row">
              <Badge tone={task.priority === "high" ? "danger" : "default"}>{task.priority}<T k={I18nKey.APPS$TASKS_PRIORITY_2} /></Badge>
            </div>
          ) : null}
          {task.assignee ? (
            <div className="arco-task-drawer__meta-row">
              <TaskAssigneeMeta assignee={task.assignee} />
            </div>
          ) : null}
        </div>

        {task.description ? (
          <section className="arco-task-drawer__section">
            <h3 className="arco-task-drawer__section-label"><T k={I18nKey.APPS$TASKS_DESCRIPTION} /></h3>
            <p className="arco-task-drawer__description">{task.description}</p>
          </section>
        ) : null}

        <section className="arco-task-drawer__section">
          <h3 className="arco-task-drawer__section-label"><T k={I18nKey.APPS$TASKS_RECENT_ACTIVITY} /></h3>
          <TaskHistoryList events={recentHistory} emptyMessage="No activity recorded for this task." />
        </section>
      </div>

      <footer className="arco-task-drawer__footer">
        <Button variant="default" onClick={() => onEdit(task.id)}>
          <Pencil size={14} /><T k={I18nKey.COMMON$EDIT} /></Button>
        {task.archived ? (
          <Button variant="default" onClick={() => onRestore(task.id)}>
            <ArchiveRestore size={14} /><T k={I18nKey.APPS$TASKS_RESTORE} /></Button>
        ) : (
          <Button variant="default" onClick={() => onArchive(task.id)}>
            <Archive size={14} /><T k={I18nKey.APPS$TASKS_ARCHIVE} /></Button>
        )}
        <Button variant="danger" onClick={() => onDelete(task.id)}>
          <Trash2 size={14} /><T k={I18nKey.COMMON$DELETE} /></Button>
      </footer>
    </div>
  );
}

export interface TaskHistoryPanelProps {
  open: boolean;
  events: TaskHistoryEvent[];
  onClose: () => void;
}

export function TaskHistoryPanel({ open, events, onClose }: TaskHistoryPanelProps) {
  if (!open) return null;

  return (
    <div className="arco-task-history-panel__backdrop" role="presentation" onClick={onClose}>
      <aside
        className="arco-task-history-panel"
        role="dialog"
        aria-labelledby="task-history-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="arco-task-history-panel__header">
          <div>
            <h2 id="task-history-title"><T k={I18nKey.APPS$TASKS_TASK_HISTORY} /></h2>
            <p className="arco-task-history-panel__subtitle"><T k={I18nKey.APPS$TASKS_ALL_ACTIVITY_ACROSS_YOUR_TASKS} /></p>
          </div>
          <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onClose} aria-label={i18n.t(I18nKey.COMMON$CLOSE)}>
            <X size={16} />
          </button>
        </header>
        <div className="arco-task-history-panel__body arco-scroll">
          <TaskHistoryList events={events} emptyMessage="No task activity yet." />
        </div>
      </aside>
    </div>
  );
}
