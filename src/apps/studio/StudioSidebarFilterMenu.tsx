import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
/**
 * Filter menu for the conversations sidebar — organize mode and sort field,
 * matching agent-canvas ConversationPanelFilterMenu (subset of options).
 */
import { CalendarArrowDown, Clock3, Folder, ListFilter } from "lucide-react";
import { Menu, type MenuItem } from "../../components/Menu";
import type { ConversationSortField, OrganizeMode } from "./sidebarGrouping";

export interface StudioSidebarFilterMenuProps {
  organizeMode: OrganizeMode;
  sortField: ConversationSortField;
  onOrganizeModeChange: (mode: OrganizeMode) => void;
  onSortFieldChange: (field: ConversationSortField) => void;
}

export function StudioSidebarFilterMenu({
  organizeMode,
  sortField,
  onOrganizeModeChange,
  onSortFieldChange,
}: StudioSidebarFilterMenuProps) {
  const items: MenuItem[] = [
    {
      id: "grouped",
      label: "By workspace",
      icon: Folder,
      checked: organizeMode === "grouped",
      onSelect: () => onOrganizeModeChange("grouped"),
    },
    {
      id: "recent",
      label: "Recent",
      icon: Clock3,
      checked: organizeMode === "recent",
      onSelect: () => onOrganizeModeChange("recent"),
    },
    {
      id: "sort-created",
      label: "Date created",
      icon: CalendarArrowDown,
      checked: sortField === "created",
      separatorAbove: true,
      onSelect: () => onSortFieldChange("created"),
    },
    {
      id: "sort-updated",
      label: "Last updated",
      icon: Clock3,
      checked: sortField === "updated",
      onSelect: () => onSortFieldChange("updated"),
    },
  ];

  return (
    <Menu
      side="bottom"
      align="end"
      aria-label={i18n.t(I18nKey.APPS$STUDIO_CONVERSATION_LIST_FILTERS)}
      items={items}
      trigger={
        <button type="button" className="arco-sidenav__filtericon" aria-label={i18n.t(I18nKey.APPS$STUDIO_CONVERSATION_LIST_FILTERS)}>
          <ListFilter size={13} />
        </button>
      }
    />
  );
}
