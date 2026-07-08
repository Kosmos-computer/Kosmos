import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useEffect, useState } from "react";
import { CheckSquare, X } from "lucide-react";
import { useAuthStore } from "../../os/auth/authStore";
import { Button, Chip, Input } from "../../components/ui";
import { AssignToPicker } from "./AssignToPicker";
import type { CreateTaskInput, TaskAssignee, TaskItem, TaskPriority } from "./types";

const PRIORITY_OPTIONS: { id: TaskPriority; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

export interface AddTaskModalProps {
  open: boolean;
  task?: TaskItem | null;
  defaultDueDateISO?: string;
  onClose: () => void;
  onAdd: (input: CreateTaskInput) => void;
  onUpdate?: (id: string, input: CreateTaskInput) => void;
}

export function AddTaskModal({
  open,
  task,
  defaultDueDateISO,
  onClose,
  onAdd,
  onUpdate,
}: AddTaskModalProps) {
  const isEditing = Boolean(task);
  const selfName = useAuthStore((s) => s.user?.displayName ?? s.user?.username ?? "You");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority | undefined>("medium");
  const [dueDateISO, setDueDateISO] = useState(defaultDueDateISO ?? "");
  const [assignee, setAssignee] = useState<TaskAssignee | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setPriority(task.priority ?? "medium");
      setDueDateISO(task.dueDateISO ?? "");
      setAssignee(task.assignee);
      return;
    }
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDateISO(defaultDueDateISO ?? "");
    setAssignee(undefined);
  }, [open, task, defaultDueDateISO]);

  if (!open) return null;

  const canSave = title.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    const input: CreateTaskInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDateISO: dueDateISO || undefined,
      assignee,
    };
    if (task && onUpdate) {
      onUpdate(task.id, input);
    } else {
      onAdd(input);
    }
    onClose();
  }

  return (
    <div className="arco-task-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="arco-task-modal"
        role="dialog"
        aria-labelledby="task-modal-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="arco-task-modal__header">
          <div className="arco-task-modal__title-row">
            <CheckSquare size={18} aria-hidden />
            <h2 id="task-modal-title">{isEditing ? "Edit task" : "Add task"}</h2>
          </div>
          <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onClose} aria-label={i18n.t(I18nKey.COMMON$CLOSE)}>
            <X size={16} />
          </button>
        </header>

        <div className="arco-task-modal__body">
          <section className="arco-task-modal__section">
            <label className="arco-task-modal__label" htmlFor="add-task-title-input"><T k={I18nKey.APPS$TASKS_TITLE} /></label>
            <Input
              id="add-task-title-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={i18n.t(I18nKey.APPS$TASKS_WHAT_NEEDS_TO_GET_DONE)}
              autoFocus
            />
          </section>

          <section className="arco-task-modal__section">
            <label className="arco-task-modal__label" htmlFor="add-task-description"><T k={I18nKey.APPS$TASKS_DESCRIPTION_OPTIONAL} /></label>
            <textarea
              id="add-task-description"
              className="arco-input arco-task-modal__textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={i18n.t(I18nKey.APPS$TASKS_ADD_NOTES_OR_CONTEXT)}
              rows={3}
            />
          </section>

          <section className="arco-task-modal__section">
            <span className="arco-task-modal__label"><T k={I18nKey.APPS$TASKS_PRIORITY} /></span>
            <div className="arco-task-modal__chips" role="group" aria-label={i18n.t(I18nKey.APPS$TASKS_TASK_PRIORITY)}>
              {PRIORITY_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  active={priority === option.id}
                  aria-pressed={priority === option.id}
                  onClick={() => setPriority(option.id)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </section>

          <section className="arco-task-modal__section">
            <AssignToPicker value={assignee} selfName={selfName} onChange={setAssignee} />
          </section>

          <section className="arco-task-modal__section">
            <label className="arco-task-modal__label" htmlFor="add-task-due-date"><T k={I18nKey.APPS$TASKS_DUE_DATE_OPTIONAL} /></label>
            <Input
              id="add-task-due-date"
              type="date"
              value={dueDateISO}
              onChange={(event) => setDueDateISO(event.target.value)}
            />
          </section>
        </div>

        <footer className="arco-task-modal__footer">
          <Button variant="ghost" onClick={onClose}><T k={I18nKey.COMMON$CANCEL} /></Button>
          <Button variant="primary" onClick={handleSave} disabled={!canSave}>
            {isEditing ? "Save changes" : "Add task"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
