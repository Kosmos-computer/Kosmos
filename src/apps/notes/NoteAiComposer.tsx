import { useRef } from "react";
import { Send, Sparkles, Square, X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { useDismiss } from "../../components/useDismiss";
import type { NoteAiApplyMode } from "./useNoteAiAssist";

const APPLY_MODES: { id: NoteAiApplyMode; label: string }[] = [
  { id: "selection", label: "Selection" },
  { id: "insert", label: "Insert" },
  { id: "document", label: "Whole note" },
];

export function NoteAiComposer({
  open,
  prompt,
  streaming,
  applyMode,
  hasSelection,
  onPromptChange,
  onApplyModeChange,
  onSubmit,
  onStop,
  onClose,
}: {
  open: boolean;
  prompt: string;
  streaming: boolean;
  applyMode: NoteAiApplyMode;
  hasSelection: boolean;
  onPromptChange: (value: string) => void;
  onApplyModeChange: (mode: NoteAiApplyMode) => void;
  onSubmit: () => void;
  onStop: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDismiss(open, onClose, panelRef);

  if (!open) return null;

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (prompt.trim() && !streaming) onSubmit();
    }
  }

  return (
    <div ref={panelRef} className="arco-notes-ai" role="dialog" aria-label="AI writing assistant">
      <div className="arco-notes-ai__header">
        <div className="arco-notes-ai__title">
          <Sparkles size={15} strokeWidth={1.75} aria-hidden="true" />
          <span>Write with AI</span>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close AI composer" onClick={onClose}>
          <X size={15} strokeWidth={1.75} />
        </Button>
      </div>

      <textarea
        className="arco-notes-ai__input"
        rows={3}
        value={prompt}
        placeholder={
          hasSelection
            ? "Describe how to rewrite the selection…"
            : "Describe what to write or change in this note…"
        }
        disabled={streaming}
        aria-label="AI instruction"
        onChange={(event) => onPromptChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />

      <div className="arco-notes-ai__footer">
        <div className="arco-notes-ai__modes arco-chip-row" role="group" aria-label="Apply mode">
          {APPLY_MODES.map(({ id, label }) => (
            <Chip
              key={id}
              active={applyMode === id}
              disabled={streaming || (id === "selection" && !hasSelection)}
              onClick={() => onApplyModeChange(id)}
            >
              {label}
            </Chip>
          ))}
        </div>

        <div className="arco-notes-ai__actions">
          {streaming ? (
            <Button variant="default" onClick={onStop}>
              <Square size={14} strokeWidth={1.75} />
              Stop
            </Button>
          ) : (
            <Button variant="primary" disabled={!prompt.trim()} onClick={onSubmit}>
              <Send size={14} strokeWidth={1.75} />
              Generate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
