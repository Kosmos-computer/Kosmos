import { NavSidebar } from "../../components/patterns";
import type { SettingsNavGroup, SettingsSectionId } from "./settingsSections";

export function SettingsNav({
  groups,
  activeSection,
  onSelect,
}: {
  groups: SettingsNavGroup[];
  activeSection: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
}) {
  return (
    <NavSidebar
      sections={groups.map((group) => ({
        id: group.id,
        title: group.title,
        items: group.items.map((item) => {
          const Icon = item.icon;
          return {
            id: item.id,
            label: item.label,
            leading: <Icon size={15} strokeWidth={1.75} />,
            active: activeSection === item.id,
            onClick: () => onSelect(item.id),
          };
        }),
      }))}
    />
  );
}
