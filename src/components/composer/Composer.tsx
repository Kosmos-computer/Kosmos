/**
 * Composer — the rich chat input surface ported from the agent-studio design:
 * a bordered card holding an optional formatting toolbar, an auto-resizing
 * textarea, and a controls row (attach / emoji / formatting / mode / model /
 * mic / send), with a dockable notice banner and a usage status bar beneath.
 *
 * Fully controlled and app-agnostic: Studio (and later Chat) own the draft
 * value, submission, and every menu's wiring; the composer owns only its
 * presentation state (toolbar visibility, textarea height, slash menu).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ApprovalMode } from "@shared/types";
import type { MenuItem } from "../Menu";
import { ComposerControlsRow, type ComposerModeItem } from "./ComposerControlsRow";
import { ComposerFormattingToolbar } from "./ComposerFormattingToolbar";
import type { ComposerConnector, ComposerPanelToggle } from "./ComposerAttachMenu";
import { ComposerSlashMenu } from "./ComposerSlashMenu";
import {
  applySlashCommand,
  filterSlashCommands,
  matchSlashToken,
  type SlashCommand,
} from "./slashCommands";
import { UsagePopover, type UsageStats } from "./UsagePopover";
import { applyMarkdownFormat, insertAtCursor, type MarkdownFormat } from "./markdownFormatting";

const TEXTAREA_MAX_HEIGHT = 220;
const HISTORY_LIMIT = 50;

function loadHistory(storageKey?: string): string[] {
  if (!storageKey || typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveHistory(storageKey: string | undefined, entries: string[]): void {
  if (!storageKey || typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(entries.slice(-HISTORY_LIMIT)));
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

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
  /** Approval posture (Ask / Approve / Full). Shown when both are set. */
  approvalMode?: ApprovalMode;
  onApprovalModeChange?: (mode: ApprovalMode) => void;
  /** Current model label + menu of alternatives. */
  model?: string;
  modelItems?: MenuItem[];
  /** Plus-menu wiring: attach actions, connectors, and workspace panel switches. */
  onAddFile?: () => void;
  onAddFolder?: () => void;
  onImportGitHubIssue?: () => void;
  onSlashCommands?: () => void;
  onAddPlugins?: () => void;
  onManageConnectors?: () => void;
  onBrowseConnectors?: () => void;
  connectors?: ComposerConnector[];
  panelToggles?: ComposerPanelToggle[];
  /** Voice session wiring — when provided, the mic button toggles it. */
  voiceActive?: boolean;
  voiceAvailable?: boolean;
  onVoiceToggle?: () => void;
  /** Banner docked below the card — pair with `ComposerNotice`. */
  notice?: ReactNode;
  /** When set, renders the usage status bar below the card. */
  usage?: UsageStats;
  /** Optional left slot in the status row (e.g. project picker). */
  statusStart?: ReactNode;
  onPlanUsageClick?: () => void;
  inputAriaLabel?: string;
  /** Optional localStorage key for submitted prompt history navigation. */
  historyStorageKey?: string;
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
  approvalMode,
  onApprovalModeChange,
  model,
  modelItems,
  onAddFile,
  onAddFolder,
  onImportGitHubIssue,
  onSlashCommands,
  onAddPlugins,
  onManageConnectors,
  onBrowseConnectors,
  connectors,
  panelToggles,
  voiceActive,
  voiceAvailable,
  onVoiceToggle,
  notice,
  usage,
  statusStart,
  onPlanUsageClick,
  inputAriaLabel = "Message",
  historyStorageKey,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftBeforeHistoryRef = useRef("");
  const [formattingVisible, setFormattingVisible] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [history, setHistory] = useState<string[]>(() => loadHistory(historyStorageKey));
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  useEffect(() => {
    setHistory(loadHistory(historyStorageKey));
    setHistoryIndex(null);
    draftBeforeHistoryRef.current = "";
  }, [historyStorageKey]);

  // Auto-resize: collapse then grow to content, capped so long drafts scroll.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }, [value]);

  const slashToken = useMemo(() => matchSlashToken(value), [value]);
  const slashCommands = useMemo(
    () => (slashToken ? filterSlashCommands(slashToken.query) : []),
    [slashToken],
  );
  const slashOpen = Boolean(slashToken);

  useLayoutEffect(() => {
    setSlashIndex(0);
  }, [slashToken?.query]);

  const handleFormat = useCallback(
    (format: MarkdownFormat) => {
      applyMarkdownFormat(textareaRef.current, value, format, onChange);
    },
    [value, onChange],
  );

  const selectSlashCommand = useCallback(
    (command: SlashCommand) => {
      onChange(applySlashCommand(value, command));
      textareaRef.current?.focus();
    },
    [value, onChange],
  );

  const commitHistory = useCallback(
    (text: string) => {
      if (!historyStorageKey) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      setHistory((current) => {
        const next = [...current.filter((entry) => entry !== trimmed), trimmed].slice(-HISTORY_LIMIT);
        saveHistory(historyStorageKey, next);
        return next;
      });
      setHistoryIndex(null);
      draftBeforeHistoryRef.current = "";
    },
    [historyStorageKey],
  );

  const submitCurrent = useCallback(() => {
    if (!value.trim()) return;
    commitHistory(value);
    onSubmit();
  }, [commitHistory, onSubmit, value]);

  const replaceFromHistory = useCallback(
    (nextValue: string, nextIndex: number | null) => {
      setHistoryIndex(nextIndex);
      onChange(nextValue);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.selectionStart = nextValue.length;
        el.selectionEnd = nextValue.length;
      });
    },
    [onChange],
  );

  const navigateHistory = useCallback(
    (direction: "older" | "newer") => {
      if (!historyStorageKey || history.length === 0) return false;

      if (direction === "older") {
        const nextIndex = historyIndex == null ? history.length - 1 : Math.max(0, historyIndex - 1);
        if (historyIndex == null) draftBeforeHistoryRef.current = value;
        replaceFromHistory(history[nextIndex] ?? "", nextIndex);
        return true;
      }

      if (historyIndex == null) return false;
      if (historyIndex >= history.length - 1) {
        replaceFromHistory(draftBeforeHistoryRef.current, null);
      } else {
        const nextIndex = historyIndex + 1;
        replaceFromHistory(history[nextIndex] ?? "", nextIndex);
      }
      return true;
    },
    [history, historyIndex, historyStorageKey, replaceFromHistory, value],
  );

  // Slash-commands entry inserts "/" so the typeahead opens.
  const handleSlashCommands = useCallback(() => {
    if (onSlashCommands) {
      onSlashCommands();
      return;
    }
    insertAtCursor(textareaRef.current, value, "/", onChange);
    textareaRef.current?.focus();
  }, [onSlashCommands, value, onChange]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "u") {
      e.preventDefault();
      onAddFile?.();
      return;
    }

    if (slashOpen && slashCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % slashCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + slashCommands.length) % slashCommands.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const command = slashCommands[slashIndex] ?? slashCommands[0];
        if (command) selectSlashCommand(command);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        // Drop the trailing slash token so the menu closes.
        if (slashToken) onChange(value.slice(0, slashToken.start));
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitCurrent();
      return;
    }

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const el = e.currentTarget;
      const hasSelection = el.selectionStart !== el.selectionEnd;
      const isMultiline = value.includes("\n");
      const canMoveOlder = !hasSelection && (!isMultiline || el.selectionStart === 0);
      const canMoveNewer = !hasSelection && (!isMultiline || el.selectionEnd === value.length);
      if (e.key === "ArrowUp" && canMoveOlder && navigateHistory("older")) {
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowDown" && canMoveNewer && navigateHistory("newer")) {
        e.preventDefault();
      }
    }
  }

  return (
    <div className="arco-composer">
      <div className={`arco-composer__card ${notice ? "arco-composer__card--docked" : ""}`}>
        {formattingVisible && <ComposerFormattingToolbar onFormat={handleFormat} />}
        <div className="arco-composer__inputwrap">
          {slashOpen && (
            <ComposerSlashMenu
              commands={slashCommands}
              activeIndex={slashIndex}
              onActiveIndexChange={setSlashIndex}
              onSelect={selectSlashCommand}
            />
          )}
          <textarea
            ref={textareaRef}
            className="arco-composer__textarea"
            rows={1}
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            aria-label={inputAriaLabel}
            aria-autocomplete={slashOpen ? "list" : undefined}
            onChange={(e) => {
              setHistoryIndex(null);
              onChange(e.target.value);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
        <ComposerControlsRow
          disabled={disabled}
          streaming={streaming}
          onAddFile={onAddFile}
          onAddFolder={onAddFolder}
          onImportGitHubIssue={onImportGitHubIssue}
          onSlashCommands={handleSlashCommands}
          onAddPlugins={onAddPlugins}
          onManageConnectors={onManageConnectors}
          onBrowseConnectors={onBrowseConnectors}
          connectors={connectors}
          panelToggles={panelToggles}
          onInsertEmoji={(emoji) => insertAtCursor(textareaRef.current, value, emoji, onChange)}
          formattingVisible={formattingVisible}
          onToggleFormatting={() => setFormattingVisible((v) => !v)}
          modes={modes}
          activeModeId={activeModeId}
          onModeChange={onModeChange}
          approvalMode={approvalMode}
          onApprovalModeChange={onApprovalModeChange}
          model={model}
          modelItems={modelItems}
          voiceActive={voiceActive}
          voiceAvailable={voiceAvailable}
          onVoiceToggle={onVoiceToggle}
          onSubmit={submitCurrent}
          onStop={onStop}
          canSubmit={value.trim().length > 0}
        />
      </div>
      {notice && <div className="arco-composer__noticeslot">{notice}</div>}
      {(statusStart || usage) && (
        <div className={`arco-composer__statusbar${statusStart ? " arco-composer__statusbar--split" : ""}`}>
          {statusStart}
          {usage && <UsagePopover stats={usage} onPlanUsageClick={onPlanUsageClick} />}
        </div>
      )}
    </div>
  );
}
