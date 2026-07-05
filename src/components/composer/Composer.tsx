/**
 * Composer — the rich chat input surface ported from the agent-studio design:
 * a bordered card holding an optional formatting toolbar, an auto-resizing
 * textarea, and a controls row (attach / emoji / formatting / mode / model /
 * mic / send), with a dockable notice banner and a usage status bar beneath.
 *
 * Fully controlled and app-agnostic: Studio (and later Chat) own the draft
 * value, submission, and every menu's wiring; the composer owns only its
 * presentation state (toolbar visibility, textarea height).
 */
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { MenuItem } from "../Menu";
import { ComposerControlsRow, type ComposerModeItem } from "./ComposerControlsRow";
import { ComposerFormattingToolbar } from "./ComposerFormattingToolbar";
import type { ComposerPanelToggle } from "./ComposerAttachMenu";
import { UsagePopover, type UsageStats } from "./UsagePopover";
import { applyMarkdownFormat, insertAtCursor, type MarkdownFormat } from "./markdownFormatting";

const TEXTAREA_MAX_HEIGHT = 220;

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** While streaming, the send button becomes a stop button. */
  streaming?: boolean;
  onStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** Agent / Ask switch shown as a compact menu in the controls row. */
  modes?: ComposerModeItem[];
  activeModeId?: string;
  onModeChange?: (id: string) => void;
  /** Current model label + menu of alternatives. */
  model?: string;
  modelItems?: MenuItem[];
  /** Plus-menu wiring: attach action and workspace panel switches. */
  onAddFile?: () => void;
  panelToggles?: ComposerPanelToggle[];
  /** Banner docked below the card — pair with `ComposerNotice`. */
  notice?: ReactNode;
  /** When set, renders the usage status bar below the card. */
  usage?: UsageStats;
  onPlanUsageClick?: () => void;
  inputAriaLabel?: string;
}

export function Composer({
  value,
  onChange,
  onSubmit,
  streaming,
  onStop,
  placeholder = "Message the agent…",
  disabled,
  modes,
  activeModeId,
  onModeChange,
  model,
  modelItems,
  onAddFile,
  panelToggles,
  notice,
  usage,
  onPlanUsageClick,
  inputAriaLabel = "Message",
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [formattingVisible, setFormattingVisible] = useState(false);

  // Auto-resize: collapse then grow to content, capped so long drafts scroll.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }, [value]);

  const handleFormat = useCallback(
    (format: MarkdownFormat) => {
      applyMarkdownFormat(textareaRef.current, value, format, onChange);
    },
    [value, onChange],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSubmit();
    }
  }

  return (
    <div className="arco-composer">
      <div className={`arco-composer__card ${notice ? "arco-composer__card--docked" : ""}`}>
        {formattingVisible && <ComposerFormattingToolbar onFormat={handleFormat} />}
        <textarea
          ref={textareaRef}
          className="arco-composer__textarea"
          rows={1}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={inputAriaLabel}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <ComposerControlsRow
          disabled={disabled}
          streaming={streaming}
          onAddFile={onAddFile}
          panelToggles={panelToggles}
          onInsertEmoji={(emoji) => insertAtCursor(textareaRef.current, value, emoji, onChange)}
          formattingVisible={formattingVisible}
          onToggleFormatting={() => setFormattingVisible((v) => !v)}
          modes={modes}
          activeModeId={activeModeId}
          onModeChange={onModeChange}
          model={model}
          modelItems={modelItems}
          onSubmit={onSubmit}
          onStop={onStop}
          canSubmit={value.trim().length > 0}
        />
      </div>
      {notice && <div className="arco-composer__noticeslot">{notice}</div>}
      {usage && (
        <div className="arco-composer__statusbar">
          <UsagePopover stats={usage} onPlanUsageClick={onPlanUsageClick} />
        </div>
      )}
    </div>
  );
}
