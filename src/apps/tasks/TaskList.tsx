import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
import { Check, History, Plus } from "lucide-react";
import { Badge, Button } from "../../components/ui";
import { TaskAssigneeMeta } from "./AssignToPicker";
import type { TaskItem } from "./types";
import { TASK_STATUS_LABEL, taskAssigneeLabel } from "./types";

export function TaskRow({
  task,
  selected,
  onSelect,
  onToggleComplete,
}: {
  task: TaskItem;
  selected?: boolean;
  onSelect: (id: string) => void;
  onToggleComplete: (id: string) => void;
}) {
  const completed = task.status === "completed";

  return (
    <div
      className={[
        "arco-task-row",
        selected ? "arco-task-row--selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className={["arco-task-row__check", completed ? "arco-task-row__check--done" : ""].filter(Boolean).join(" ")}
        aria-label={completed ? "Mark incomplete" : "Mark complete"}
        onClick={(event) => {
          event.stopPropagation();
          onToggleComplete(task.id);
        }}
      >
        {completed ? <Check size={14} /> : null}
      </button>
      <button type="button" className="arco-task-row__body" onClick={() => onSelect(task.id)}>
        <div className="arco-task-row__title">{task.title}</div>
        {task.description ? <div className="arco-task-row__desc">{task.description}</div> : null}
        <div className="arco-task-row__meta">
          {task.priority ? <Badge tone={task.priority === "high" ? "danger" : "default"}>{task.priority}</Badge> : null}
          {task.dueDate ? <span>{task.dueDate}</span> : null}
          {task.assignee ? (
            <span className="arco-task-row__assignee" title={taskAssigneeLabel(task.assignee)}>
              <TaskAssigneeMeta assignee={task.assignee} compact />
            </span>
          ) : null}
        </div>
      </button>
    </div>
  );
}

export function TasksList({
  groups,
  openCount,
  selectedTaskId,
  onSelectTask,
  onToggleComplete,
  onAddTask,
  onShowHistory,
}: {
  groups: { status: TaskItem["status"]; items: TaskItem[] }[];
  openCount: number;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onAddTask: () => void;
  onShowHistory: () => void;
}) {
  return (
    <div className="arco-tasks__main">
      <div className="arco-tasks__header">
        <div className="arco-tasks__header-title">
          <Check size={15} strokeWidth={1.75} /><T k={I18nKey.APPS$TASKS_TASKS} /><Badge>{openCount}</Badge>
        </div>
        <div className="arco-tasks__header-actions">
          <Button variant="default" onClick={onShowHistory}>
            <History size={13} /><T k={I18nKey.APPS$TASKS_HISTORY} /></Button>
          <Button variant="primary" onClick={onAddTask}>
            <Plus size={13} /><T k={I18nKey.APPS$TASKS_ADD_TASK} /></Button>
        </div>
      </div>
      <div className="arco-tasks__scroll arco-scroll">
        {groups.length === 0 ? (
          <div className="arco-empty">
            <strong className="arco-empty__title"><T k={I18nKey.APPS$TASKS_NO_TASKS_YET} /></strong><T k={I18nKey.APPS$TASKS_ADD_A_TASK_TO_GET_STARTED_OR_LET_THE_AGENT_CREATE_THEM_F} /><div className="arco-empty__actions">
              <Button variant="primary" onClick={onAddTask}>
                <Plus size={13} /><T k={I18nKey.APPS$TASKS_ADD_TASK} /></Button>
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.status} className="arco-tasks__group">
              <div className="arco-tasks__group-header">
                {TASK_STATUS_LABEL[group.status]}
                <Badge>{group.items.length}</Badge>
              </div>
              {group.items.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  selected={task.id === selectedTaskId}
                  onSelect={onSelectTask}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}
