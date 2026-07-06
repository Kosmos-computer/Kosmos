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
  Pilcrow,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
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

export interface EditorToolbarProps {
  className?: string;
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

/** Document formatting toolbar — stub controls until editor wiring. */
export function EditorToolbar({ className = "" }: EditorToolbarProps) {
  const [blockFormat, setBlockFormat] = useState<BlockFormat>("paragraph");
  const [marks, setMarks] = useState<Set<TextMark>>(() => new Set());
  const [align, setAlign] = useState<TextAlign>("left");

  const blockItems: MenuItem[] = (Object.keys(BLOCK_LABELS) as BlockFormat[]).map((format) => ({
    id: format,
    label: BLOCK_LABELS[format],
    checked: blockFormat === format,
    onSelect: () => setBlockFormat(format),
  }));

  const toggleMark = (mark: TextMark) => {
    setMarks((prev) => {
      const next = new Set(prev);
      if (next.has(mark)) next.delete(mark);
      else next.add(mark);
      return next;
    });
  };

  return (
    <div
      className={["arco-editor-toolbar", className].filter(Boolean).join(" ")}
      role="toolbar"
      aria-label="Formatting"
    >
      <Menu
        align="start"
        aria-label="Block type"
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
        <ToolButton label="Bold" pressed={marks.has("bold")} onClick={() => toggleMark("bold")}>
          <Bold size={15} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton label="Italic" pressed={marks.has("italic")} onClick={() => toggleMark("italic")}>
          <Italic size={15} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton label="Underline" pressed={marks.has("underline")} onClick={() => toggleMark("underline")}>
          <Underline size={15} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton
          label="Strikethrough"
          pressed={marks.has("strikethrough")}
          onClick={() => toggleMark("strikethrough")}
        >
          <Strikethrough size={15} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton label="Inline code" pressed={marks.has("code")} onClick={() => toggleMark("code")}>
          <Code size={15} strokeWidth={1.75} />
        </ToolButton>
      </div>

      <span className="arco-editor-toolbar__divider" role="separator" aria-orientation="vertical" />

      <ToolButton label="Link">
        <Link2 size={15} strokeWidth={1.75} />
      </ToolButton>

      <span className="arco-editor-toolbar__divider" role="separator" aria-orientation="vertical" />

      <div className="arco-editor-toolbar__group">
        <ToolButton label="Align left" pressed={align === "left"} onClick={() => setAlign("left")}>
          <AlignLeft size={15} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton label="Align center" pressed={align === "center"} onClick={() => setAlign("center")}>
          <AlignCenter size={15} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton label="Align right" pressed={align === "right"} onClick={() => setAlign("right")}>
          <AlignRight size={15} strokeWidth={1.75} />
        </ToolButton>
      </div>

      <span className="arco-editor-toolbar__spacer" />

      <div className="arco-editor-toolbar__group">
        <ToolButton label="Undo" disabled>
          <Undo2 size={15} strokeWidth={1.75} />
        </ToolButton>
        <ToolButton label="Redo" disabled>
          <Redo2 size={15} strokeWidth={1.75} />
        </ToolButton>
      </div>
    </div>
  );
}
