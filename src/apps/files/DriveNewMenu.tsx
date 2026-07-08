import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  FileText,
  Folder,
  Grid3X3,
  Layers,
  Plus,
} from "lucide-react";
import { Menu, type MenuItem } from "../../components/Menu";
import type { DriveNewItemType } from "./types";

const NEW_MENU_ITEMS: { id: DriveNewItemType; label: string; icon: typeof FileText; separatorAbove?: boolean }[] = [
  { id: "folder", label: "Folder", icon: Folder },
  { id: "slides", label: "Slides", icon: Layers, separatorAbove: true },
  { id: "sheet", label: "Sheets", icon: Grid3X3 },
  { id: "doc", label: "Docs", icon: FileText },
  { id: "task", label: "Tasks", icon: CheckSquare, separatorAbove: true },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
];

export function DriveNewMenu({ onCreate }: { onCreate: (type: DriveNewItemType) => void }) {
  const items: MenuItem[] = NEW_MENU_ITEMS.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    separatorAbove: item.separatorAbove,
    onSelect: () => onCreate(item.id),
  }));

  return (
    <Menu
      className="arco-drive-new-menu"
      aria-label={i18n.t(I18nKey.APPS$FILES_CREATE_NEW)}
      align="start"
      items={items}
      trigger={
        <button type="button" className="arco-btn arco-nav-sidebar__primary arco-drive-new-menu__trigger">
          <Plus size={15} strokeWidth={1.75} /><T k={I18nKey.APPS$FILES_NEW} /><ChevronDown size={14} className="arco-drive-new-menu__chevron" aria-hidden="true" />
        </button>
      }
    />
  );
}
