import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { useMemo } from "react";
import { Search } from "lucide-react";
import { NavSidebar } from "../../components/patterns";
import { Input } from "../../components/ui";
import { filterSettingsNavGroups, parentNavItem, type SettingsNavGroup, type SettingsSectionId } from "./settingsSections";

export function SettingsNav({
  groups,
  activeSection,
  onSelect,
  searchQuery,
  onSearchChange,
}: {
  groups: SettingsNavGroup[];
  activeSection: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}) {
  const filteredGroups = useMemo(
    () => (searchQuery ? filterSettingsNavGroups(groups, searchQuery) : groups),
    [groups, searchQuery],
  );

  const expandedParentId = parentNavItem(groups, activeSection)?.id;

  return (
    <NavSidebar
      header={
        onSearchChange ? (
          <div className="arco-settings-nav-search">
            <Search size={14} strokeWidth={1.75} className="arco-settings-nav-search__icon" aria-hidden="true" />
            <Input
              type="search"
              placeholder={i18n.t(I18nKey.APPS$SETTINGS_SEARCH_SETTINGS)}
              value={searchQuery ?? ""}
              onChange={(event) => onSearchChange(event.target.value)}
              aria-label={i18n.t(I18nKey.APPS$SETTINGS_SEARCH_SETTINGS)}
              className="arco-settings-nav-search__input"
            />
          </div>
        ) : null
      }
      scrollContent={
        <div className="arco-nav-sidebar__sections">
          {filteredGroups.map((group) => (
            <div key={group.id}>
              <div className="arco-nav-sidebar__section-header">
                <span className="arco-nav-sidebar__section-title">{group.title}</span>
              </div>
              <div className="arco-nav-sidebar__section-items">
                {group.items.map((item) => (
                  <SettingsNavBranch
                    key={item.id}
                    item={item}
                    activeSection={activeSection}
                    expandedParentId={expandedParentId}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      }
    />
  );
}

function SettingsNavBranch({
  item,
  activeSection,
  expandedParentId,
  onSelect,
  depth = 0,
}: {
  item: SettingsNavGroup["items"][number];
  activeSection: SettingsSectionId;
  expandedParentId?: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
  depth?: number;
}) {
  const hasChildren = Boolean(item.children?.length);
  const isParentActive = hasChildren && item.children!.some((child) => child.id === activeSection);
  const isExpanded = expandedParentId === item.id || isParentActive;
  const isActive = !hasChildren && item.id === activeSection;
  const Icon = item.icon;

  return (
    <div className={depth > 0 ? "arco-settings-nav-sub" : undefined}>
      <button
        type="button"
        className={[
          "arco-list-item",
          "arco-nav-sidebar__nav-item",
          isActive ? "arco-list-item--active" : "",
          depth > 0 ? "arco-settings-nav-sub__item" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-current={isActive ? "true" : undefined}
        onClick={() => onSelect(hasChildren ? item.children![0].id : item.id)}
      >
        {depth === 0 && Icon ? (
          <span className="arco-list-item__leading">
            <Icon size={15} strokeWidth={1.75} />
          </span>
        ) : null}
        <span className="arco-list-item__body">
          <span className="arco-list-item__label">{item.label}</span>
        </span>
        {item.badge ? <span className="arco-list-item__trailing">{item.badge}</span> : null}
      </button>
      {hasChildren && isExpanded ? (
        <div className="arco-settings-nav-sub__group">
          {item.children!.map((child) => (
            <SettingsNavBranch
              key={child.id}
              item={child}
              activeSection={activeSection}
              expandedParentId={expandedParentId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
