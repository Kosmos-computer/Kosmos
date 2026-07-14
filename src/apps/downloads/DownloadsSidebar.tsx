import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Globe,
  List,
  PauseCircle,
  Search,
  Square,
} from "lucide-react";
import { NavSidebar } from "../../components/patterns";
import { Input } from "../../components/ui";
import type { CategoryFilter, TorrentCategory, TrackerGroup } from "./types";

const CATEGORY_ICONS: Record<TorrentCategory, LucideIcon> = {
  all: List,
  downloading: ArrowDownToLine,
  seeding: ArrowUpFromLine,
  completed: CheckCircle2,
  active: Activity,
  inactive: PauseCircle,
  stopped: Square,
  error: AlertCircle,
};

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
          items: categories.map((entry) => {
            const Icon = CATEGORY_ICONS[entry.id];
            return {
              id: entry.id,
              label: entry.label,
              trailing: <span className="arco-downloads-sidebar__count">{entry.count}</span>,
              leading: <Icon size={14} strokeWidth={1.75} />,
              active: category === entry.id && !trackerFilter,
              onClick: () => {
                onTrackerFilterChange(null);
                onCategoryChange(entry.id);
              },
            };
          }),
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
            leading: <Globe size={14} strokeWidth={1.75} />,
            active: trackerFilter === entry.url,
            onClick: () =>
              onTrackerFilterChange(trackerFilter === entry.url ? null : entry.url),
          })),
        },
      ]}
    />
  );
}
