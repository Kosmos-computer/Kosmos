import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
/**
 * ComposerFormattingToolbar — Slack-style text formatting row docked to the
 * top edge of the composer card. Unlike the design reference (visual-only),
 * every button applies real Markdown to the textarea selection.
 */
import { useTranslation } from "react-i18next";
import {
  Bold,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Strikethrough,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MarkdownFormat } from "./markdownFormatting";

const FORMAT_BUTTONS: { format: MarkdownFormat; label: string; icon: LucideIcon }[] = [
  { format: "bold", label: "Bold", icon: Bold },
  { format: "italic", label: "Italic", icon: Italic },
  { format: "strikethrough", label: "Strikethrough", icon: Strikethrough },
  { format: "link", label: "Insert link", icon: Link2 },
  { format: "ordered-list", label: "Numbered list", icon: ListOrdered },
  { format: "bullet-list", label: "Bulleted list", icon: List },
  { format: "quote", label: "Quote", icon: Quote },
  { format: "code", label: "Code block", icon: Code },
];

export interface ComposerFormattingToolbarProps {
  onFormat: (format: MarkdownFormat) => void;
}

export function ComposerFormattingToolbar({ onFormat }: ComposerFormattingToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="arco-composer__toolbar" role="toolbar" aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_TEXT_FORMATTING)}>
      {FORMAT_BUTTONS.map(({ format, label, icon: Icon }) => (
        <button
          key={format}
          type="button"
          className="arco-btn arco-btn--ghost arco-btn--icon"
          aria-label={label}
          title={label}
          // Preserve the textarea selection: mousedown would steal focus and
          // collapse it before the click handler could read the range.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onFormat(format)}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

export interface ComposerFormattingToggleProps {
  visible: boolean;
  onToggle: () => void;
}

/** Controls-row button that shows or hides the formatting toolbar. */
export function ComposerFormattingToggle({ visible, onToggle }: ComposerFormattingToggleProps) {
  const label = visible ? "Hide formatting toolbar" : "Show formatting toolbar";
  return (
    <button
      type="button"
      className="arco-btn arco-btn--ghost arco-btn--icon"
      aria-label={label}
      title={label}
      aria-pressed={visible}
      onClick={onToggle}
    >
      <Pilcrow size={14} />
    </button>
  );
}
