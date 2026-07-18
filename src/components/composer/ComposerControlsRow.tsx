import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
/**
 * ComposerControlsRow — the single row of controls under the textarea:
 * scrollable left cluster (attach, optional emoji, mode, approval, model)
 * and a docked right cluster (mic, send/stop). Tools and agent live inside
 * the "+" attach menu.
 *
 * Narrow widths (the Studio chat pane is user-resizable) are handled the way
 * the design reference does: controls that no longer fit collapse, trailing
 * first, into a "More actions" overflow menu. Widths are measured per control
 * and cached so hidden controls keep their last known width.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, MicOff, MoreHorizontal, Mic, Send, Square } from "lucide-react";
import type { ApprovalMode } from "@shared/types";
import { Menu, type MenuItem } from "../Menu";
import {
  ComposerAttachMenu,
  type ComposerConnector,
} from "./ComposerAttachMenu";
import { ComposerEmojiPicker } from "./ComposerEmojiPicker";
import {
  APPROVAL_MODE_OPTIONS,
  approvalModeLabel,
} from "./approvalModes";
import { TOOLSETS } from "./toolsets";

type ControlId =
  | "attach"
  | "emoji"
  | "mode"
  | "approval"
  | "model";

const CONTROL_GAP = 4;
const OVERFLOW_DOCK_WIDTH = 36;

export interface ComposerModeItem {
  id: string;
  label: string;
}

export interface ComposerControlsRowProps {
  disabled?: boolean;
  streaming?: boolean;
  onAddFile?: () => void;
  onAddFolder?: () => void;
  onImportGitHubIssue?: () => void;
  onSlashCommands?: () => void;
  onAddPlugins?: () => void;
  onManageConnectors?: () => void;
  onBrowseConnectors?: () => void;
  connectors?: ComposerConnector[];
  emojiVisible?: boolean;
  onEmojiVisibleChange?: (visible: boolean) => void;
  richTextVisible?: boolean;
  onRichTextVisibleChange?: (visible: boolean) => void;
  onInsertEmoji: (emoji: string) => void;
  modes?: ComposerModeItem[];
  activeModeId?: string;
  onModeChange?: (id: string) => void;
  /** Agent approval posture (Ask / Approve / Full). Hidden when unset. */
  approvalMode?: ApprovalMode;
  onApprovalModeChange?: (mode: ApprovalMode) => void;
  /** Active toolset ids (multi-select). Hidden when unset. */
  toolsetIds?: string[];
  onToolsetIdsChange?: (ids: string[]) => void;
  /** Active agent profile label + menu (Hermes-style chip). */
  agent?: string;
  agentItems?: MenuItem[];
  model?: string;
  modelItems?: MenuItem[];
  /** Voice session wiring — when provided, the mic button toggles it. */
  voiceActive?: boolean;
  voiceAvailable?: boolean;
  onVoiceToggle?: () => void;
  onSubmit: () => void;
  onStop?: () => void;
  canSubmit: boolean;
}

export function ComposerControlsRow({
  disabled,
  streaming,
  onAddFile,
  onAddFolder,
  onImportGitHubIssue,
  onSlashCommands,
  onAddPlugins,
  onManageConnectors,
  onBrowseConnectors,
  connectors,
  emojiVisible = false,
  onEmojiVisibleChange,
  richTextVisible = false,
  onRichTextVisibleChange,
  onInsertEmoji,
  modes,
  activeModeId,
  onModeChange,
  approvalMode,
  onApprovalModeChange,
  toolsetIds,
  onToolsetIdsChange,
  agent,
  agentItems,
  model,
  modelItems,
  voiceActive,
  voiceAvailable,
  onVoiceToggle,
  onSubmit,
  onStop,
  canSubmit,
}: ComposerControlsRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Partial<Record<ControlId, HTMLDivElement | null>>>({});
  const itemWidthsRef = useRef<Partial<Record<ControlId, number>>>({});
  const [overflowIds, setOverflowIds] = useState<ControlId[]>([]);

  const showModeMenu = Boolean(modes?.length && activeModeId && onModeChange);
  const activeModeLabel = modes?.find((m) => m.id === activeModeId)?.label;
  const showApprovalMenu = Boolean(approvalMode && onApprovalModeChange);
  const activeApprovalLabel = approvalMode ? approvalModeLabel(approvalMode) : undefined;
  const showModelMenu = Boolean(modelItems?.length);
  const modelLabel = model ?? "Model";

  const controlIds = useMemo<ControlId[]>(() => {
    const ids: ControlId[] = ["attach"];
    if (emojiVisible) ids.push("emoji");
    if (showModeMenu) ids.push("mode");
    if (showApprovalMenu) ids.push("approval");
    if (showModelMenu) ids.push("model");
    return ids;
  }, [emojiVisible, showModeMenu, showApprovalMenu, showModelMenu]);

  // ── Overflow measurement ─────────────────────────────────────────────────
  // Drop controls from the end until the visible set (plus the overflow dock,
  // when needed) fits in the space left of the send cluster.
  const measureOverflow = useCallback(() => {
    const row = rowRef.current;
    const right = rightRef.current;
    if (!row || !right) return;

    controlIds.forEach((id) => {
      const el = itemRefs.current[id];
      if (el && el.offsetWidth > 0) itemWidthsRef.current[id] = el.offsetWidth;
    });

    const maxLeftWidth = Math.max(0, row.clientWidth - right.offsetWidth - 8);

    const widthFor = (ids: ControlId[], reserveDock: boolean) =>
      ids.reduce(
        (total, id, i) => total + (itemWidthsRef.current[id] ?? 0) + (i > 0 ? CONTROL_GAP : 0),
        reserveDock ? OVERFLOW_DOCK_WIDTH : 0,
      );

    const hidden: ControlId[] = [];
    const visible = [...controlIds];
    while (visible.length > 0 && widthFor(visible, hidden.length > 0) > maxLeftWidth) {
      const removed = visible.pop();
      if (!removed) break;
      hidden.unshift(removed);
    }

    setOverflowIds((current) =>
      current.length === hidden.length && current.every((id, i) => id === hidden[i])
        ? current
        : hidden,
    );
  }, [controlIds]);

  useLayoutEffect(() => {
    measureOverflow();
  }, [measureOverflow, emojiVisible, activeModeLabel, activeApprovalLabel, model, disabled]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const observer = new ResizeObserver(measureOverflow);
    observer.observe(row);
    return () => observer.disconnect();
  }, [measureOverflow]);

  // ── Overflow menu contents ───────────────────────────────────────────────
  // Hidden controls reappear as flat menu items (the emoji grid has no menu
  // equivalent, so it simply drops out at extreme widths, like the reference).
  const overflowItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [];

    if (overflowIds.includes("attach")) {
      items.push(
        { id: "of-attach", label: "Add files or photos", onSelect: () => onAddFile?.() },
        { id: "of-folder", label: "Add folder", onSelect: () => onAddFolder?.() },
        { id: "of-github", label: "Import GitHub issue", onSelect: () => onImportGitHubIssue?.() },
        { id: "of-slash", label: "Slash commands", onSelect: () => onSlashCommands?.() },
        { id: "of-plugins", label: "Add plugins…", onSelect: () => onAddPlugins?.() },
      );
      connectors?.forEach((connector) => {
        items.push({
          id: `of-connector-${connector.id}`,
          label: connector.label,
          checked: connector.enabled,
          onSelect: () => connector.onEnabledChange(!connector.enabled),
        });
      });
      if (onEmojiVisibleChange) {
        items.push({
          id: "of-emoji-toggle",
          label: i18n.t(I18nKey.COMPONENTS$COMPOSER_EMOJIS),
          checked: emojiVisible,
          separatorAbove: true,
          onSelect: () => onEmojiVisibleChange(!emojiVisible),
        });
      }
      if (onRichTextVisibleChange) {
        items.push({
          id: "of-richtext-toggle",
          label: i18n.t(I18nKey.COMPONENTS$COMPOSER_RICH_TEXT),
          checked: richTextVisible,
          separatorAbove: !onEmojiVisibleChange,
          onSelect: () => onRichTextVisibleChange(!richTextVisible),
        });
      }
      if (toolsetIds && onToolsetIdsChange) {
        TOOLSETS.forEach((set, i) => {
          const checked = toolsetIds.includes(set.id);
          items.push({
            id: `of-toolset-${set.id}`,
            label: set.label,
            description: set.description,
            checked,
            separatorAbove: i === 0,
            onSelect: () => {
              if (checked) {
                const next = toolsetIds.filter((id) => id !== set.id);
                onToolsetIdsChange(next.length > 0 ? next : [set.id]);
              } else {
                onToolsetIdsChange([...toolsetIds, set.id]);
              }
            },
          });
        });
      }
      if (agentItems?.length) {
        agentItems.forEach((item, i) => {
          items.push({
            ...item,
            id: `of-agent-${item.id}`,
            separatorAbove: i === 0 || item.separatorAbove,
          });
        });
      }
    }

    if (overflowIds.includes("mode") && modes) {
      modes.forEach((mode, i) => {
        items.push({
          id: `of-mode-${mode.id}`,
          label: mode.label,
          checked: mode.id === activeModeId,
          separatorAbove: items.length > 0 && i === 0,
          onSelect: () => onModeChange?.(mode.id),
        });
      });
    }

    if (overflowIds.includes("approval") && approvalMode && onApprovalModeChange) {
      APPROVAL_MODE_OPTIONS.forEach((option, i) => {
        items.push({
          id: `of-approval-${option.id}`,
          label: option.label,
          description: option.description,
          icon: option.icon,
          checked: option.id === approvalMode,
          separatorAbove: items.length > 0 && i === 0,
          onSelect: () => onApprovalModeChange(option.id),
        });
      });
    }

    if (overflowIds.includes("model") && modelItems) {
      modelItems.forEach((item, i) => {
        items.push({
          ...item,
          id: `of-model-${item.id}`,
          separatorAbove: items.length > 0 && i === 0,
        });
      });
    }

    return items;
  }, [
    overflowIds,
    onAddFile,
    onAddFolder,
    onImportGitHubIssue,
    onSlashCommands,
    onAddPlugins,
    connectors,
    emojiVisible,
    onEmojiVisibleChange,
    richTextVisible,
    onRichTextVisibleChange,
    modes,
    activeModeId,
    onModeChange,
    approvalMode,
    onApprovalModeChange,
    toolsetIds,
    onToolsetIdsChange,
    agentItems,
    modelItems,
  ]);

  const showOverflowDock = overflowIds.length > 0 && overflowItems.length > 0;

  const setItemRef = (id: ControlId) => (node: HTMLDivElement | null) => {
    itemRefs.current[id] = node;
  };

  const controlClass = (id: ControlId) =>
    `arco-composer__control ${overflowIds.includes(id) ? "arco-composer__control--hidden" : ""}`;

  const modeItems = useMemo<MenuItem[]>(
    () =>
      modes?.map((mode) => ({
        id: mode.id,
        label: mode.label,
        checked: mode.id === activeModeId,
        onSelect: () => onModeChange?.(mode.id),
      })) ?? [],
    [modes, activeModeId, onModeChange],
  );

  const approvalItems = useMemo<MenuItem[]>(
    () =>
      APPROVAL_MODE_OPTIONS.map((option) => ({
        id: option.id,
        label: option.label,
        description: option.description,
        icon: option.icon,
        checked: option.id === approvalMode,
        onSelect: () => onApprovalModeChange?.(option.id),
      })),
    [approvalMode, onApprovalModeChange],
  );

  return (
    <div ref={rowRef} className="arco-composer__controls">
      <div className="arco-composer__controlsleft">
        <div className="arco-composer__track">
          <div ref={setItemRef("attach")} className={controlClass("attach")} aria-hidden={overflowIds.includes("attach") || undefined}>
            <ComposerAttachMenu
              disabled={disabled}
              onAddFile={onAddFile}
              onAddFolder={onAddFolder}
              onImportGitHubIssue={onImportGitHubIssue}
              onSlashCommands={onSlashCommands}
              onAddPlugins={onAddPlugins}
              onManageConnectors={onManageConnectors}
              onBrowseConnectors={onBrowseConnectors}
              connectors={connectors}
              toolsetIds={toolsetIds}
              onToolsetIdsChange={onToolsetIdsChange}
              agent={agent}
              agentItems={agentItems}
              emojiVisible={emojiVisible}
              onEmojiVisibleChange={onEmojiVisibleChange}
              richTextVisible={richTextVisible}
              onRichTextVisibleChange={onRichTextVisibleChange}
            />
          </div>
          {emojiVisible && (
            <div ref={setItemRef("emoji")} className={controlClass("emoji")} aria-hidden={overflowIds.includes("emoji") || undefined}>
              <ComposerEmojiPicker disabled={disabled} onSelect={onInsertEmoji} />
            </div>
          )}
          {showModeMenu && (
            <div ref={setItemRef("mode")} className={controlClass("mode")} aria-hidden={overflowIds.includes("mode") || undefined}>
              <Menu
                side="top"
                align="start"
                aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_CONVERSATION_MODE)}
                items={modeItems}
                trigger={
                  <button type="button" className="arco-composer__pickertrigger">
                    <span className="arco-composer__pickerlabel">{activeModeLabel}</span>
                    <ChevronDown size={12} />
                  </button>
                }
              />
            </div>
          )}
          {showApprovalMenu && (
            <div ref={setItemRef("approval")} className={controlClass("approval")} aria-hidden={overflowIds.includes("approval") || undefined}>
              <Menu
                side="top"
                align="start"
                heading="How should agent actions be approved?"
                aria-label="Agent approval"
                items={approvalItems}
                searchable={false}
                trigger={
                  <button type="button" className="arco-composer__pickertrigger">
                    <span className="arco-composer__pickerlabel">{activeApprovalLabel}</span>
                    <ChevronDown size={12} />
                  </button>
                }
              />
            </div>
          )}
          {showModelMenu && (
            <div ref={setItemRef("model")} className={controlClass("model")} aria-hidden={overflowIds.includes("model") || undefined}>
              <Menu
                side="top"
                align="start"
                aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_CHOOSE_MODEL)}
                items={modelItems ?? []}
                trigger={
                  <button type="button" className="arco-composer__pickertrigger">
                    <span className="arco-composer__pickerlabel">{modelLabel}</span>
                    <ChevronDown size={12} />
                  </button>
                }
              />
            </div>
          )}
        </div>

        {showOverflowDock && (
          <div className="arco-composer__overflowdock">
            <Menu
              side="top"
              align="end"
              aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_MORE_COMPOSER_ACTIONS)}
              items={overflowItems}
              trigger={
                <button
                  type="button"
                  className="arco-btn arco-btn--ghost arco-btn--icon"
                  aria-label={i18n.t(I18nKey.APPS$FILES_MORE_ACTIONS)}
                  title={i18n.t(I18nKey.APPS$FILES_MORE_ACTIONS)}
                >
                  <MoreHorizontal size={15} />
                </button>
              }
            />
          </div>
        )}
      </div>

      <div ref={rightRef} className="arco-composer__controlsright">
        <button
          type="button"
          className={`arco-btn ${voiceActive ? "arco-btn--primary" : "arco-btn--ghost"} arco-btn--icon`}
          aria-label={voiceActive ? "End voice conversation" : "Start voice conversation"}
          aria-pressed={onVoiceToggle ? voiceActive : undefined}
          title={
            onVoiceToggle
              ? voiceAvailable || voiceActive
                ? voiceActive
                  ? "End voice conversation"
                  : "Start voice conversation"
                : "Voice server offline — see voice-server/README.md"
              : "Voice input"
          }
          disabled={onVoiceToggle ? !voiceAvailable && !voiceActive : undefined}
          onClick={onVoiceToggle}
        >
          {voiceActive ? <MicOff size={15} /> : <Mic size={15} />}
        </button>
        {streaming && canSubmit ? (
          <button
            type="button"
            className="arco-btn arco-btn--primary arco-btn--icon"
            aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_SEND_MESSAGE)}
            title={i18n.t(I18nKey.COMPONENTS$COMPOSER_SEND_MESSAGE)}
            disabled={disabled || !canSubmit}
            onClick={onSubmit}
          >
            <Send size={15} />
          </button>
        ) : null}
        {streaming ? (
          <button
            type="button"
            className="arco-btn arco-btn--danger arco-btn--icon"
            aria-label={i18n.t(I18nKey.APPS$NOTES_STOP)}
            title={i18n.t(I18nKey.APPS$NOTES_STOP)}
            onClick={onStop}
          >
            <Square size={13} />
          </button>
        ) : (
          <button
            type="button"
            className="arco-btn arco-btn--primary arco-btn--icon"
            aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_SEND_MESSAGE)}
            title={i18n.t(I18nKey.COMPONENTS$COMPOSER_SEND_MESSAGE)}
            disabled={disabled || !canSubmit}
            onClick={onSubmit}
          >
            <Send size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
