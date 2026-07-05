/**
 * ComposerControlsRow — the single row of controls under the textarea:
 * scrollable left cluster (attach, emoji, formatting toggle, mode, model)
 * and a docked right cluster (mic, send/stop).
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
import { ChevronDown, MoreHorizontal, Mic, Send, Square } from "lucide-react";
import { Menu, type MenuItem } from "../Menu";
import { ComposerAttachMenu, type ComposerPanelToggle } from "./ComposerAttachMenu";
import { ComposerEmojiPicker } from "./ComposerEmojiPicker";
import { ComposerFormattingToggle } from "./ComposerFormattingToolbar";

type ControlId = "attach" | "emoji" | "formatting" | "mode" | "model";

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
  panelToggles?: ComposerPanelToggle[];
  onInsertEmoji: (emoji: string) => void;
  formattingVisible: boolean;
  onToggleFormatting: () => void;
  modes?: ComposerModeItem[];
  activeModeId?: string;
  onModeChange?: (id: string) => void;
  model?: string;
  modelItems?: MenuItem[];
  onSubmit: () => void;
  onStop?: () => void;
  canSubmit: boolean;
}

export function ComposerControlsRow({
  disabled,
  streaming,
  onAddFile,
  panelToggles,
  onInsertEmoji,
  formattingVisible,
  onToggleFormatting,
  modes,
  activeModeId,
  onModeChange,
  model,
  modelItems,
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
  const showModelMenu = Boolean(model && modelItems);

  const controlIds = useMemo<ControlId[]>(() => {
    const ids: ControlId[] = ["attach", "emoji", "formatting"];
    if (showModeMenu) ids.push("mode");
    if (showModelMenu) ids.push("model");
    return ids;
  }, [showModeMenu, showModelMenu]);

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
  }, [measureOverflow, formattingVisible, activeModeLabel, model, disabled]);

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
      if (onAddFile) items.push({ id: "of-attach", label: "Add file", onSelect: onAddFile });
      panelToggles?.forEach((toggle) => {
        items.push({
          id: `of-panel-${toggle.id}`,
          label: toggle.label,
          checked: toggle.visible,
          onSelect: () => toggle.onVisibleChange(!toggle.visible),
        });
      });
    }

    if (overflowIds.includes("formatting")) {
      items.push({
        id: "of-formatting",
        label: formattingVisible ? "Hide formatting toolbar" : "Show formatting toolbar",
        separatorAbove: items.length > 0,
        onSelect: onToggleFormatting,
      });
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
  }, [overflowIds, onAddFile, panelToggles, formattingVisible, onToggleFormatting, modes, activeModeId, onModeChange, modelItems]);

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

  return (
    <div ref={rowRef} className="arco-composer__controls">
      <div className="arco-composer__controlsleft">
        <div className="arco-composer__track">
          <div ref={setItemRef("attach")} className={controlClass("attach")} aria-hidden={overflowIds.includes("attach") || undefined}>
            <ComposerAttachMenu disabled={disabled} onAddFile={onAddFile} panelToggles={panelToggles} />
          </div>
          <div ref={setItemRef("emoji")} className={controlClass("emoji")} aria-hidden={overflowIds.includes("emoji") || undefined}>
            <ComposerEmojiPicker disabled={disabled} onSelect={onInsertEmoji} />
          </div>
          <div ref={setItemRef("formatting")} className={controlClass("formatting")} aria-hidden={overflowIds.includes("formatting") || undefined}>
            <ComposerFormattingToggle visible={formattingVisible} onToggle={onToggleFormatting} />
          </div>
          {showModeMenu && (
            <div ref={setItemRef("mode")} className={controlClass("mode")} aria-hidden={overflowIds.includes("mode") || undefined}>
              <Menu
                side="top"
                align="start"
                aria-label="Conversation mode"
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
          {showModelMenu && (
            <div ref={setItemRef("model")} className={controlClass("model")} aria-hidden={overflowIds.includes("model") || undefined}>
              <Menu
                side="top"
                align="start"
                aria-label="Choose model"
                items={modelItems ?? []}
                trigger={
                  <button type="button" className="arco-composer__pickertrigger">
                    <span className="arco-composer__pickerlabel">{model}</span>
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
              aria-label="More composer actions"
              items={overflowItems}
              trigger={
                <button
                  type="button"
                  className="arco-btn arco-btn--ghost arco-btn--icon"
                  aria-label="More actions"
                  title="More actions"
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
          className="arco-btn arco-btn--ghost arco-btn--icon"
          aria-label="Voice input"
          title="Voice input"
        >
          <Mic size={15} />
        </button>
        {streaming ? (
          <button
            type="button"
            className="arco-btn arco-btn--danger arco-btn--icon"
            aria-label="Stop"
            title="Stop"
            onClick={onStop}
          >
            <Square size={13} />
          </button>
        ) : (
          <button
            type="button"
            className="arco-btn arco-btn--primary arco-btn--icon"
            aria-label="Send message"
            title="Send message"
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
