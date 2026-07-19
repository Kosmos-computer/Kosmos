import { useEffect, useState } from "react";
import { Columns3, X } from "lucide-react";
import type { ApprovalMode } from "@shared/types";
import { Button, Chip, Input } from "../../components/ui";
import { Composer } from "../../components/composer/Composer";
import { DEFAULT_APPROVAL_MODE } from "../../components/composer/approvalModes";
import { DEFAULT_TOOLSET_IDS } from "../../components/composer/toolsets";
import type { BoardColumnId, CreateWorkItemForm, WorkItemPriority } from "./types";
import { BOARD_COLUMN_IDS, BOARD_COLUMN_LABEL } from "./types";

const PRIORITY_OPTIONS: { id: WorkItemPriority; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

const COMPOSER_MODES = [
  { id: "agent", label: "Agent" },
  { id: "ask", label: "Ask" },
];

export interface AddWorkItemModalProps {
  open: boolean;
  defaultColumnId?: BoardColumnId;
  onClose: () => void;
  /** Capture-only — park on the board without starting an agent. */
  onAdd: (input: CreateWorkItemForm) => void | Promise<void>;
  /**
   * Start agent — create card + open Studio with this brief.
   * `brief` is the composer text to send as the first turn.
   */
  onStartAgent?: (input: CreateWorkItemForm & { brief: string }) => void | Promise<void>;
}

export function AddWorkItemModal({
  open,
  defaultColumnId = "backlog",
  onClose,
  onAdd,
  onStartAgent,
}: AddWorkItemModalProps) {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [columnId, setColumnId] = useState<BoardColumnId>(defaultColumnId);
  const [priority, setPriority] = useState<WorkItemPriority | undefined>(undefined);
  const [mode, setMode] = useState("agent");
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(DEFAULT_APPROVAL_MODE);
  const [toolsetIds, setToolsetIds] = useState<string[]>(() => [...DEFAULT_TOOLSET_IDS]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setBrief("");
    setColumnId(defaultColumnId);
    setPriority(undefined);
    setMode("agent");
    setApprovalMode(DEFAULT_APPROVAL_MODE);
    setToolsetIds([...DEFAULT_TOOLSET_IDS]);
    setSaving(false);
  }, [open, defaultColumnId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  const resolvedTitle = title.trim() || brief.trim().split("\n")[0]?.trim() || "";
  const canSave = resolvedTitle.length > 0 && !saving;
  const canStart = Boolean(onStartAgent) && brief.trim().length > 0 && !saving;

  function formBase(): CreateWorkItemForm {
    return {
      title: resolvedTitle,
      description: brief.trim() || undefined,
      columnId: onStartAgent && brief.trim() ? "in_progress" : columnId,
      priority,
    };
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onAdd({
        ...formBase(),
        columnId,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleStartAgent() {
    if (!canStart || !onStartAgent) return;
    setSaving(true);
    try {
      await onStartAgent({
        ...formBase(),
        columnId: "in_progress",
        brief: brief.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="arco-task-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="arco-task-modal arco-board-modal"
        role="dialog"
        aria-labelledby="board-modal-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="arco-task-modal__header">
          <div className="arco-task-modal__title-row">
            <Columns3 size={18} aria-hidden />
            <h2 id="board-modal-title">New work item</h2>
          </div>
          <button
            type="button"
            className="arco-btn arco-btn--ghost arco-btn--icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        <div className="arco-task-modal__body">
          <section className="arco-task-modal__section">
            <label className="arco-task-modal__label" htmlFor="add-work-item-title">
              Title
            </label>
            <Input
              id="add-work-item-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to ship? (defaults from brief)"
              autoFocus
            />
          </section>

          <section className="arco-task-modal__section">
            <span className="arco-task-modal__label">Column</span>
            <div className="arco-task-modal__chips" role="group" aria-label="Board column">
              {BOARD_COLUMN_IDS.map((id) => (
                <Chip
                  key={id}
                  active={columnId === id}
                  aria-pressed={columnId === id}
                  onClick={() => setColumnId(id)}
                >
                  {BOARD_COLUMN_LABEL[id]}
                </Chip>
              ))}
            </div>
          </section>

          <section className="arco-task-modal__section">
            <span className="arco-task-modal__label">Priority</span>
            <div className="arco-task-modal__chips" role="group" aria-label="Priority">
              {PRIORITY_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  active={priority === option.id}
                  aria-pressed={priority === option.id}
                  onClick={() =>
                    setPriority((current) => (current === option.id ? undefined : option.id))
                  }
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </section>

          {onStartAgent ? (
            <section className="arco-task-modal__section arco-board-modal__composer">
              <span className="arco-task-modal__label">Agent brief</span>
              <Composer
                value={brief}
                onChange={setBrief}
                onSubmit={() => void handleStartAgent()}
                placeholder="Brief the agent and send to start…"
                disabled={saving}
                modes={COMPOSER_MODES}
                activeModeId={mode}
                onModeChange={setMode}
                approvalMode={approvalMode}
                onApprovalModeChange={setApprovalMode}
                toolsetIds={toolsetIds}
                onToolsetIdsChange={setToolsetIds}
                inputAriaLabel="Agent brief"
                historyStorageKey="arco:board:composer-history:v1"
              />
            </section>
          ) : (
            <section className="arco-task-modal__section">
              <label className="arco-task-modal__label" htmlFor="add-work-item-description">
                Description (optional)
              </label>
              <textarea
                id="add-work-item-description"
                className="arco-input arco-task-modal__textarea"
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                placeholder="Add notes or context"
                rows={3}
              />
            </section>
          )}
        </div>

        <footer className="arco-task-modal__footer">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="ghost" onClick={() => void handleSave()} disabled={!canSave}>
            Add to board
          </Button>
          {onStartAgent ? (
            <Button variant="primary" onClick={() => void handleStartAgent()} disabled={!canStart}>
              Start agent
            </Button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
