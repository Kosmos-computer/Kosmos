import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  Italic,
  Link2,
  Loader2,
  Mic,
  Pilcrow,
  Redo2,
  Sparkles,
  Square,
  Strikethrough,
  Underline,
  Undo2,
  Volume2,
} from "lucide-react";
import { Menu, type MenuItem } from "../Menu";
import { Button } from "../ui/Button";

export type BlockFormat = "paragraph" | "heading1" | "heading2" | "heading3";
export type TextMark = "bold" | "italic" | "underline" | "strikethrough" | "code";
export type TextAlign = "left" | "center" | "right";

const BLOCK_LABELS: Record<BlockFormat, string> = {
  paragraph: "Paragraph",
  heading1: "Heading 1",
  heading2: "Heading 2",
  heading3: "Heading 3",
};

export type ReadAloudStatus = "idle" | "loading" | "playing";

export interface EditorToolbarProps {
  className?: string;
  blockFormat?: BlockFormat;
  onBlockFormatChange?: (format: BlockFormat) => void;
  activeMarks?: TextMark[];
  onToggleMark?: (mark: TextMark) => void;
  onInsertLink?: () => void;
  align?: TextAlign;
  onAlignChange?: (align: TextAlign) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  readAloudStatus?: ReadAloudStatus;
  onReadAloud?: () => void;
  dictationActive?: boolean;
  dictationAvailable?: boolean;
  onDictation?: () => void;
  aiOpen?: boolean;
  onAiAssist?: () => void;
}

function ToolButton({
  label,
  pressed,
  disabled,
  children,
  onClick,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={["arco-editor-toolbar__tool", pressed ? "arco-editor-toolbar__tool--pressed" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/** Document formatting toolbar — controlled when handlers are passed, otherwise local demo state. */
export function EditorToolbar({
  className = "",
  blockFormat: blockFormatProp,
  onBlockFormatChange,
  activeMarks,
  onToggleMark,
  onInsertLink,
  align: alignProp,
  onAlignChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  readAloudStatus = "idle",
  onReadAloud,
  dictationActive,
  dictationAvailable = true,
  onDictation,
  aiOpen,
  onAiAssist,
}: EditorToolbarProps) {
  const [localBlockFormat, setLocalBlockFormat] = useState<BlockFormat>("paragraph");
  const [localMarks, setLocalMarks] = useState<Set<TextMark>>(() => new Set());
  const [localAlign, setLocalAlign] = useState<TextAlign>("left");

  const controlled = Boolean(onBlockFormatChange || onToggleMark || onAlignChange || onUndo || onRedo);
  const blockFormat = blockFormatProp ?? localBlockFormat;
  const align = alignProp ?? localAlign;
  const marks = activeMarks ?? localMarks;

  const setBlockFormat = (format: BlockFormat) => {
    if (onBlockFormatChange) onBlockFormatChange(format);
    else setLocalBlockFormat(format);
  };

  const setAlign = (value: TextAlign) => {
    if (onAlignChange) onAlignChange(value);
    else setLocalAlign(value);
  };

  const toggleMark = (mark: TextMark) => {
    if (onToggleMark) {
      onToggleMark(mark);
      return;
    }
    setLocalMarks((prev) => {
      const next = new Set(prev);
      if (next.has(mark)) next.delete(mark);
      else next.add(mark);
      return next;
    });
  };

  const hasMark = (mark: TextMark) => (marks instanceof Set ? marks.has(mark) : marks.includes(mark));

  const blockItems: MenuItem[] = (Object.keys(BLOCK_LABELS) as BlockFormat[]).map((format) => ({
    id: format,
    label: BLOCK_LABELS[format],
    checked: blockFormat === format,
    onSelect: () => setBlockFormat(format),
  }));

  return (
    <div
      className={["arco-editor-toolbar", className].filter(Boolean).join(" ")}
      role="toolbar"
      aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_FORMATTING)}
    >
      <Menu
        align="start"
        aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_BLOCK_TYPE)}
        trigger={
          <button type="button" className="arco-editor-toolbar__format-trigger">
            <Pilcrow size={15} strokeWidth={1.75} />
            <span>{BLOCK_LABELS[blockFormat]}</span>
            <ChevronDown size={13} strokeWidth={1.75} />
          </button>
        }
        items={blockItems}
      />

      <span className="arco-editor-toolbar__divider" role="separator" aria-orientation="vertical" />

      <div className="arco-editor-toolbar__group">
        <ToolButton label={i18n.t(I18nKey.APPS$LONGFORMER_BOLD)} pressed={hasMark("bold")} onClick={() => toggleMark("bold")}>
          <Bold size={15} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton label={i18n.t(I18nKey.APPS$LONGFORMER_ITALIC)} pressed={hasMark("italic")} onClick={() => toggleMark("italic")}>
          <Italic size={15} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton label={i18n.t(I18nKey.COMPONENTS$PATTERNS_UNDERLINE)} pressed={hasMark("underline")} onClick={() => toggleMark("underline")}>
          <Underline size={15} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton
          label={i18n.t(I18nKey.APPS$LONGFORMER_STRIKETHROUGH)}
          pressed={hasMark("strikethrough")}
          onClick={() => toggleMark("strikethrough")}
        >
          <Strikethrough size={15} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton label={i18n.t(I18nKey.COMPONENTS$PATTERNS_INLINE_CODE)} pressed={hasMark("code")} onClick={() => toggleMark("code")}>
          <Code size={15} strokeWidth={1.75} />
        </ToolButton>
      </div>

      <span className="arco-editor-toolbar__divider" role="separator" aria-orientation="vertical" />

      <ToolButton label={i18n.t(I18nKey.APPS$LONGFORMER_LINK)} onClick={onInsertLink}>
        <Link2 size={15} strokeWidth={1.75} />
      </ToolButton>

      <span className="arco-editor-toolbar__divider" role="separator" aria-orientation="vertical" />

      <div className="arco-editor-toolbar__group">
        <ToolButton label={i18n.t(I18nKey.COMPONENTS$PATTERNS_ALIGN_LEFT)} pressed={align === "left"} onClick={() => setAlign("left")}>
          <AlignLeft size={15} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton label={i18n.t(I18nKey.COMPONENTS$PATTERNS_ALIGN_CENTER)} pressed={align === "center"} onClick={() => setAlign("center")}>
          <AlignCenter size={15} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton label={i18n.t(I18nKey.COMPONENTS$PATTERNS_ALIGN_RIGHT)} pressed={align === "right"} onClick={() => setAlign("right")}>
          <AlignRight size={15} strokeWidth={1.75} />
        </ToolButton>
      </div>

      {(onReadAloud || onDictation || onAiAssist) && (
        <>
          <span className="arco-editor-toolbar__divider" role="separator" aria-orientation="vertical" />
          <div className="arco-editor-toolbar__group">
            {onReadAloud ? (
              <ToolButton
                label={readAloudStatus === "idle" ? "Read aloud" : "Stop reading"}
                pressed={readAloudStatus !== "idle"}
                onClick={onReadAloud}
              >
                {readAloudStatus === "loading" ? (
                  <Loader2 size={15} className="arco-spin" />
                ) : readAloudStatus === "playing" ? (
                  <Square size={15} strokeWidth={1.75} />
                ) : (
                  <Volume2 size={15} strokeWidth={1.75} />
                )}
              </ToolButton>
            ) : null}
            {onDictation ? (
              <ToolButton
                label={dictationActive ? "Stop dictation" : "Dictate"}
                pressed={dictationActive}
                disabled={!dictationAvailable}
                onClick={onDictation}
              >
                <Mic size={15} strokeWidth={1.75} />
              </ToolButton>
            ) : null}
            {onAiAssist ? (
              <ToolButton label={i18n.t(I18nKey.APPS$LONGFORMER_AI_ASSIST)} pressed={aiOpen} onClick={onAiAssist}>
                <Sparkles size={15} strokeWidth={1.75} />
              </ToolButton>
            ) : null}
          </div>
        </>
      )}

      <span className="arco-editor-toolbar__spacer" />

      <div className="arco-editor-toolbar__group">
        <ToolButton
          label={i18n.t(I18nKey.COMPONENTS$PATTERNS_UNDO)}
          disabled={controlled ? !canUndo : true}
          onClick={onUndo}
        >
          <Undo2 size={15} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton
          label={i18n.t(I18nKey.COMPONENTS$PATTERNS_REDO)}
          disabled={controlled ? !canRedo : true}
          onClick={onRedo}
        >
          <Redo2 size={15} strokeWidth={1.75} />
        </ToolButton>
      </div>
    </div>
  );
}
