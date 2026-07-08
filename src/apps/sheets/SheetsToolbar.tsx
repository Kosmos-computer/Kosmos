import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  DollarSign,
  Italic,
  Percent,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { Button } from "../../components/ui";
import { SHEETS_TOOLBAR_GROUPS } from "./types";

const TOOL_ICONS: Record<string, typeof Bold> = {
  undo: Undo2,
  redo: Redo2,
  currency: DollarSign,
  percent: Percent,
  bold: Bold,
  italic: Italic,
  strikethrough: Strikethrough,
  "align-left": AlignLeft,
  "align-center": AlignCenter,
  "align-right": AlignRight,
};

export function SheetsToolbar({
  canUndo,
  canRedo,
  activeFormats,
  onToolAction,
}: {
  canUndo: boolean;
  canRedo: boolean;
  activeFormats: ReadonlySet<string>;
  onToolAction: (toolId: string) => void;
}) {
  return (
    <div className="arco-sheets__format-toolbar" role="toolbar" aria-label={i18n.t(I18nKey.APPS$SHEETS_SPREADSHEET_FORMATTING)}>
      {SHEETS_TOOLBAR_GROUPS.map((group) => (
        <div key={group.id} className="arco-sheets__toolbar-group">
          {group.items.map((item) => {
            const Icon = TOOL_ICONS[item.id];
            const pressed = activeFormats.has(item.id);
            const disabled =
              (item.id === "undo" && !canUndo) || (item.id === "redo" && !canRedo);
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="icon"
                aria-label={item.label}
                aria-pressed={pressed}
                disabled={disabled}
                className={pressed ? "arco-sheets__tool--active" : ""}
                onClick={() => onToolAction(item.id)}
              >
                {Icon ? <Icon size={15} /> : null}
              </Button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function FormulaBar({
  address,
  value,
  onChange,
  onCommit,
}: {
  address: string;
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
}) {
  return (
    <div className="arco-sheets__formula-bar">
      <span className="arco-sheets__formula-address">{address}</span>
      <input
        className="arco-input arco-sheets__formula-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onCommit();
        }}
        aria-label={i18n.t(I18nKey.APPS$SHEETS_FORMULA_BAR)}
      />
    </div>
  );
}
