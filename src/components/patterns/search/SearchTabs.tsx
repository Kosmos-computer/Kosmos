import { I18nKey } from "../../../i18n/declaration";
import i18n from "../../../i18n/index";
import type { SearchTabDef, SearchTabId } from "./searchTypes";

export interface SearchTabsProps {
  tabs: SearchTabDef[];
  activeTab: SearchTabId;
  onTabChange: (tab: SearchTabId) => void;
}

export function SearchTabs({ tabs, activeTab, onTabChange }: SearchTabsProps) {
  return (
    <nav className="arco-search-tabs" aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_SEARCH_CATEGORIES)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`arco-search-tabs__tab${activeTab === tab.id ? " arco-search-tabs__tab--active" : ""}`}
          aria-current={activeTab === tab.id ? "page" : undefined}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export const DEFAULT_SEARCH_TABS: SearchTabDef[] = [
  { id: "all", label: "All" },
  { id: "web", label: "Web" },
  { id: "images", label: "Images" },
  { id: "news", label: "News" },
  { id: "videos", label: "Videos" },
  { id: "maps", label: "Maps" },
];
