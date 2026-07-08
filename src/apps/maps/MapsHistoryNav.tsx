import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { Car, Clock, MapPin, Search, Trash2 } from "lucide-react";
import { ListItem, NavSidebar, NavSidebarSectionHeader } from "../../components/patterns";
import { Button } from "../../components/ui";
import { formatVisitedAt } from "./mapsHistoryStore";
import type { MapHistoryEntry, MapsMode } from "./types";

export interface MapsHistoryNavProps {
  mode: MapsMode;
  onModeChange: (mode: MapsMode) => void;
  history: MapHistoryEntry[];
  activeHistoryId: string | null;
  onSelectHistory: (entry: MapHistoryEntry) => void;
  onClearHistory: () => void;
}

export function MapsHistoryNav({
  mode,
  onModeChange,
  history,
  activeHistoryId,
  onSelectHistory,
  onClearHistory,
}: MapsHistoryNavProps) {
  return (
    <NavSidebar
      className="arco-maps-history-nav"
      header={<h1 className="arco-maps-history-nav__title"><T k={I18nKey.APPS$MAPS_MAPS} /></h1>}
      quickLinks={[
        {
          id: "search",
          label: "Search",
          icon: Search,
          active: mode === "search",
          onClick: () => onModeChange("search"),
        },
        {
          id: "directions",
          label: "Directions",
          icon: Car,
          active: mode === "directions",
          onClick: () => onModeChange("directions"),
        },
      ]}
      sections={[]}
      scrollContent={
        history.length === 0 ? (
          <div className="arco-maps-history-nav__empty">
            <Clock size={16} aria-hidden />
            <p><T k={I18nKey.APPS$MAPS_PLACES_AND_ROUTES_YOU_LOOK_UP_WILL_APPEAR_HERE_FOR_THIS_} /></p>
          </div>
        ) : (
          <div className="arco-nav-sidebar__sections">
            <div>
              <NavSidebarSectionHeader title={i18n.t(I18nKey.APPS$MAPS_SESSION_HISTORY)} />
              <div className="arco-nav-sidebar__section-items">
                {history.map((entry) => {
                  if (entry.kind === "place" && entry.place) {
                    return (
                      <ListItem
                        key={entry.id}
                        className="arco-nav-sidebar__nav-item"
                        leading={<MapPin size={15} strokeWidth={1.75} />}
                        label={entry.place.name}
                        description={entry.place.address}
                        trailing={formatVisitedAt(entry.visitedAt)}
                        active={activeHistoryId === entry.id}
                        onClick={() => onSelectHistory(entry)}
                      />
                    );
                  }

                  const route = entry.route;
                  return (
                    <ListItem
                      key={entry.id}
                      className="arco-nav-sidebar__nav-item"
                      leading={<Car size={15} strokeWidth={1.75} />}
                      label={route ? `${route.from.name} → ${route.to.name}` : "Route"}
                      description={route ? `${route.duration} · ${route.distance}` : undefined}
                      trailing={formatVisitedAt(entry.visitedAt)}
                      active={activeHistoryId === entry.id}
                      onClick={() => onSelectHistory(entry)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )
      }
      footer={
        history.length > 0 ? (
          <Button variant="ghost" className="arco-maps-history-nav__clear" onClick={onClearHistory}>
            <Trash2 size={14} aria-hidden /><T k={I18nKey.APPS$MAPS_CLEAR_HISTORY} /></Button>
        ) : null
      }
    />
  );
}
