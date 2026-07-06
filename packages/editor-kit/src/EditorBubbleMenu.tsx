import { BubbleMenu } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import type { LucideIcon } from "lucide-react";
import { Bold, Code, Italic, Loader2, Strikethrough, Underline } from "lucide-react";
import { toggleTextMark, type TextMark } from "./useEditorToolbar";

export interface BubbleMenuExtraAction {
  id: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  loading?: boolean;
  onClick: () => void;
}

const MARKS: { mark: TextMark; label: string; icon: typeof Bold }[] = [
  { mark: "bold", label: "Bold", icon: Bold },
  { mark: "italic", label: "Italic", icon: Italic },
  { mark: "underline", label: "Underline", icon: Underline },
  { mark: "strikethrough", label: "Strikethrough", icon: Strikethrough },
  { mark: "code", label: "Inline code", icon: Code },
];

/** Floating formatting menu — appears on text selection inside the editor. */
export function EditorBubbleMenu({
  editor,
  extraActions,
}: {
  editor: Editor;
  extraActions?: BubbleMenuExtraAction[];
}) {
  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 120, placement: "top", maxWidth: "none" }}
      className="ek-bubble-menu"
    >
      {extraActions?.map(({ id, label, icon: Icon, active, loading, onClick }) => (
        <button
          key={id}
          type="button"
          className={["ek-bubble-menu__btn", active ? "ek-bubble-menu__btn--active" : ""]
            .filter(Boolean)
            .join(" ")}
          aria-label={label}
          aria-pressed={active}
          onMouseDown={(event) => {
            event.preventDefault();
            onClick();
          }}
        >
          {loading ? <Loader2 size={14} className="arco-spin" /> : <Icon size={14} strokeWidth={1.75} />}
        </button>
      ))}
      {extraActions?.length ? <span className="ek-bubble-menu__divider" role="separator" /> : null}
      {MARKS.map(({ mark, label, icon: Icon }) => {
        const active =
          mark === "strikethrough" ? editor.isActive("strike") : editor.isActive(mark);
        return (
          <button
            key={mark}
            type="button"
            className={["ek-bubble-menu__btn", active ? "ek-bubble-menu__btn--active" : ""]
              .filter(Boolean)
              .join(" ")}
            aria-label={label}
            aria-pressed={active}
            onMouseDown={(event) => {
              event.preventDefault();
              toggleTextMark(editor, mark);
            }}
          >
            <Icon size={14} strokeWidth={1.75} />
          </button>
        );
      })}
    </BubbleMenu>
  );
}
