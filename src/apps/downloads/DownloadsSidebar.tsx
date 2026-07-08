import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { Filter, Radio, Search } from "lucide-react";
import { NavSidebar } from "../../components/patterns";
import { Input } from "../../components/ui";
import type { CategoryFilter, TrackerGroup } from "./types";
import type { TorrentCategory } from "./types";
import { useTranslation } from "react-i18next";

export interface DownloadsSidebarProps {
  categories: CategoryFilter[];
  category: TorrentCategory;
  onCategoryChange: (category: TorrentCategory) => void;
  trackers: TrackerGroup[];
  trackerFilter: string | null;
  onTrackerFilterChange: (tracker: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function DownloadsSidebar({
  categories,
  category,
  onCategoryChange,
  trackers,
  trackerFilter,
  onTrackerFilterChange,
  searchQuery,
  onSearchChange,
}: DownloadsSidebarProps) {
  const { t } = useTranslation();
  return (
    <NavSidebar
      className="arco-downloads-sidebar"
      header={
        <div className="arco-downloads-sidebar__search">
          <Search size={15} className="arco-downloads-sidebar__search-icon" aria-hidden="true" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={i18n.t(I18nKey.APPS$DOWNLOADS_FILTER_TORRENTS)}
            aria-label={i18n.t(I18nKey.APPS$DOWNLOADS_FILTER_TORRENTS)}
            className="arco-downloads-sidebar__search-input"
          />
        </div>
      }
      sections={[
        {
          id: "categories",
          title: "Show",
          items: categories.map((entry) => ({
            id: entry.id,
            label: entry.label,
            trailing: <span className="arco-downloads-sidebar__count">{entry.count}</span>,
            leading: <Filter size={14} strokeWidth={1.75} />,
            active: category === entry.id && !trackerFilter,
            onClick: () => {
              onTrackerFilterChange(null);
              onCategoryChange(entry.id);
            },
          })),
        },
        {
          id: "trackers",
          title: "Trackers",
          items: trackers.map((entry) => ({
            id: entry.id,
            label: (
              <span className="arco-downloads-sidebar__tracker-label" title={entry.url}>
                {entry.url.replace(/^https?:\/\//, "").replace(/^udp:\/\//, "")}
              </span>
            ),
            trailing: <span className="arco-downloads-sidebar__count">{entry.count}</span>,
            leading: <Radio size={14} strokeWidth={1.75} />,
            active: trackerFilter === entry.url,
            onClick: () =>
              onTrackerFilterChange(trackerFilter === entry.url ? null : entry.url),
          })),
        },
      ]}
    />
  );
}
