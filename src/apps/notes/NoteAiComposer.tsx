import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useRef } from "react";
import { Send, Sparkles, Square, X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { useDismiss } from "../../components/useDismiss";
import type { NoteAiApplyMode } from "./useNoteAiAssist";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (prompt.trim() && !streaming) onSubmit();
    }
  }

  return (
    <div ref={panelRef} className="arco-notes-ai" role="dialog" aria-label={i18n.t(I18nKey.APPS$NOTES_AI_WRITING_ASSISTANT)}>
      <div className="arco-notes-ai__header">
        <div className="arco-notes-ai__title">
          <Sparkles size={15} strokeWidth={1.75} aria-hidden="true" />
          <span><T k={I18nKey.APPS$NOTES_WRITE_WITH_AI} /></span>
        </div>
        <Button variant="ghost" size="icon" aria-label={i18n.t(I18nKey.APPS$NOTES_CLOSE_AI_COMPOSER)} onClick={onClose}>
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
        aria-label={i18n.t(I18nKey.APPS$NOTES_AI_INSTRUCTION)}
        onChange={(event) => onPromptChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />

      <div className="arco-notes-ai__footer">
        <div className="arco-notes-ai__modes arco-chip-row" role="group" aria-label={i18n.t(I18nKey.APPS$NOTES_APPLY_MODE)}>
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
              <Square size={14} strokeWidth={1.75} /><T k={I18nKey.APPS$NOTES_STOP} /></Button>
          ) : (
            <Button variant="primary" disabled={!prompt.trim()} onClick={onSubmit}>
              <Send size={14} strokeWidth={1.75} /><T k={I18nKey.APPS$NOTES_GENERATE} /></Button>
          )}
        </div>
      </div>
    </div>
  );
}
