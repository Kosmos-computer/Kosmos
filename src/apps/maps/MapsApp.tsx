import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftRight,
  ExternalLink,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  X,
} from "lucide-react";
import { ListItem, SidebarPane } from "../../components/patterns";
import { Button, EmptyState, Input } from "../../components/ui";
import { MapCanvas } from "./MapCanvas";
import { MapsHistoryNav } from "./MapsHistoryNav";
import { useMaps } from "./useMaps";

export function MapsApp() {
  const { t } = useTranslation();
  const maps = useMaps();
  const selected = maps.results.find((p) => p.id === maps.selectedId) ?? null;

  return (
    <div className="arco-maps">
      <aside className="arco-maps__history-nav" aria-label={i18n.t(I18nKey.APPS$MAPS_MAPS_SESSION_HISTORY)}>
        <MapsHistoryNav
          mode={maps.mode}
          onModeChange={maps.setMode}
          history={maps.history}
          activeHistoryId={maps.activeHistoryId}
          onSelectHistory={maps.restoreHistoryEntry}
          onClearHistory={maps.clearHistory}
        />
      </aside>

      <SidebarPane width={380} minWidth={300} maxWidth={480}>
        <div className="arco-maps__sidebar">
          {maps.mode === "search" ? (
            <>
              <div className="arco-maps__search">
                <Search size={16} className="arco-icon--tertiary" aria-hidden />
                <Input
                  value={maps.query}
                  onChange={(e) => maps.setQuery(e.target.value)}
                  placeholder={i18n.t(I18nKey.APPS$MAPS_SEARCH_PLACES_OR_ADDRESSES)}
                  aria-label={i18n.t(I18nKey.APPS$MAPS_SEARCH_PLACES)}
                />
                {maps.query ? (
                  <Button
                    variant="ghost"
                    className="arco-btn--icon arco-maps__clear"
                    aria-label={i18n.t(I18nKey.APPS$MAPS_CLEAR_SEARCH)}
                    onClick={() => maps.setQuery("")}
                  >
                    <X size={16} />
                  </Button>
                ) : null}
              </div>

              <div className="arco-maps__results" role="listbox" aria-label={i18n.t(I18nKey.APPS$MAPS_SEARCH_RESULTS)}>
                {maps.loading ? (
                  <EmptyState title={i18n.t(I18nKey.COMPONENTS$PATTERNS_SEARCHING)}><T k={I18nKey.APPS$MAPS_QUERYING_OPENSTREETMAP} /></EmptyState>
                ) : maps.error ? (
                  <EmptyState title={i18n.t(I18nKey.APPS$MAPS_SEARCH_FAILED)}>{maps.error}</EmptyState>
                ) : maps.query && maps.results.length === 0 ? (
                  <EmptyState title={i18n.t(I18nKey.APPS$MAPS_NO_RESULTS)}><T k={I18nKey.APPS$MAPS_TRY_A_DIFFERENT_SEARCH_TERM_OR_ZOOM_THE_MAP} /></EmptyState>
                ) : (
                  maps.results.map((place) => (
                    <ListItem
                      key={place.id}
                      role="option"
                      aria-selected={place.id === maps.selectedId}
                      active={place.id === maps.selectedId}
                      leading={<MapPin size={16} />}
                      label={place.name}
                      description={
                        <>
                          <span className="arco-maps__result-category">{place.category}</span>
                          <span>{place.address}</span>
                        </>
                      }
                      onClick={() => maps.selectPlace(place.id)}
                    />
                  ))
                )}
              </div>

              <label className="arco-maps__footer">
                <input
                  type="checkbox"
                  checked={maps.searchInView}
                  onChange={(e) => maps.setSearchInView(e.target.checked)}
                /><T k={I18nKey.APPS$MAPS_UPDATE_RESULTS_WHEN_MAP_MOVES} /></label>
            </>
          ) : (
            <>
              <div className="arco-maps__directions-form">
                <div className="arco-maps__endpoint">
                  <span className="arco-maps__endpoint-dot arco-maps__endpoint-dot--start" aria-hidden />
                  {maps.useCurrentLocation ? (
                    <div className="arco-maps__endpoint-current">
                      <span><T k={I18nKey.APPS$MAPS_CURRENT_LOCATION} /></span>
                      <Button
                        variant="ghost"
                        className="arco-btn--icon"
                        aria-label={i18n.t(I18nKey.APPS$MAPS_ENTER_A_START_ADDRESS_INSTEAD)}
                        title={i18n.t(I18nKey.APPS$MAPS_ENTER_A_START_ADDRESS_INSTEAD)}
                        onClick={() => maps.setUseCurrentLocation(false)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <Input
                      value={maps.fromQuery}
                      onChange={(e) => maps.setFromQuery(e.target.value)}
                      placeholder={i18n.t(I18nKey.APPS$MAPS_CHOOSE_STARTING_POINT)}
                      aria-label={i18n.t(I18nKey.APPS$MAPS_STARTING_POINT)}
                    />
                  )}
                </div>

                <div className="arco-maps__endpoint">
                  <span className="arco-maps__endpoint-dot arco-maps__endpoint-dot--end" aria-hidden />
                  <Input
                    value={maps.toQuery}
                    onChange={(e) => maps.setToQuery(e.target.value)}
                    placeholder={i18n.t(I18nKey.APPS$MAPS_CHOOSE_DESTINATION)}
                    aria-label={i18n.t(I18nKey.APPS$MAPS_DESTINATION)}
                  />
                </div>

                <div className="arco-maps__directions-actions">
                  <Button variant="ghost" className="arco-btn--icon" aria-label={i18n.t(I18nKey.APPS$MAPS_SWAP_START_AND_DESTINATION)} onClick={maps.swapEndpoints}>
                    <ArrowLeftRight size={16} />
                  </Button>
                  {!maps.useCurrentLocation ? (
                    <Button
                      variant="ghost"
                      className="arco-maps__locate-btn"
                      onClick={() => {
                        maps.setUseCurrentLocation(true);
                        maps.setFromQuery("");
                      }}
                    >
                      <LocateFixed size={14} aria-hidden /><T k={I18nKey.APPS$MAPS_USE_MY_LOCATION} /></Button>
                  ) : null}
                  <Button variant="primary" className="arco-maps__route-btn" onClick={() => void maps.getDirections()} disabled={maps.routeLoading}>
                    <Navigation size={14} aria-hidden />
                    {maps.routeLoading ? "Routing…" : "Get directions"}
                  </Button>
                </div>
              </div>

              <div className="arco-maps__results">
                {maps.routeError ? <EmptyState title={i18n.t(I18nKey.APPS$MAPS_DIRECTIONS_FAILED)}>{maps.routeError}</EmptyState> : null}
                {maps.route ? (
                  <>
                    <div className="arco-maps__route-summary">
                      <div>
                        <strong>{maps.route.duration}</strong>
                        <span>{maps.route.distance}</span>
                      </div>
                    </div>
                    <div className="arco-maps__route-endpoints">
                      <div>
                        <span className="arco-maps__result-category"><T k={I18nKey.APPS$MAPS_FROM} /></span>
                        <span>{maps.route.from.name}</span>
                      </div>
                      <div>
                        <span className="arco-maps__result-category"><T k={I18nKey.APPS$MAPS_TO} /></span>
                        <span>{maps.route.to.name}</span>
                      </div>
                    </div>
                    <ol className="arco-maps__steps">
                      {maps.route.steps.map((step, index) => (
                        <li key={`${step.instruction}-${index}`}>
                          <span className="arco-maps__step-instruction">{step.instruction}</span>
                          <span className="arco-maps__step-meta">
                            {step.distance}
                            {step.duration ? ` · ${step.duration}` : ""}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : !maps.routeError && !maps.routeLoading ? (
                  <EmptyState title={i18n.t(I18nKey.APPS$MAPS_PLAN_A_ROUTE)}><T k={I18nKey.APPS$MAPS_ENTER_A_DESTINATION_AND_CHOOSE_GET_DIRECTIONS} /></EmptyState>
                ) : null}
              </div>
            </>
          )}
        </div>
      </SidebarPane>

      <div className="arco-maps__map-area">
        <MapCanvas
          places={maps.mode === "search" ? maps.results : maps.route ? [maps.route.to] : []}
          selectedId={maps.selectedId}
          onSelectPlace={maps.selectPlace}
          onViewportChange={maps.refreshInView}
          route={maps.route}
        />

        {selected && maps.mode === "search" ? (
          <div className="arco-maps__detail-card">
            <div className="arco-maps__detail-header">
              <h2>{selected.name}</h2>
              <span className="arco-maps__detail-category">{selected.category}</span>
            </div>
            <p className="arco-maps__detail-address">{selected.address}</p>
            <div className="arco-maps__detail-actions">
              <Button variant="primary" onClick={() => void maps.directionsToPlace(selected)}>
                <Navigation size={14} aria-hidden /><T k={I18nKey.APPS$MAPS_DIRECTIONS} /></Button>
              <a
                className="arco-maps__detail-link"
                href={`https://www.openstreetmap.org/?mlat=${selected.lat}&mlon=${selected.lon}#map=16/${selected.lat}/${selected.lon}`}
                target="_blank"
                rel="noopener noreferrer"
              ><T k={I18nKey.APPS$MAPS_OPEN_IN_OPENSTREETMAP} /><ExternalLink size={14} aria-hidden />
              </a>
            </div>
          </div>
        ) : null}

        <div className="arco-maps__attribution"><T k={I18nKey.APPS$MAPS_MAP_DATA_COPY} />{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer"><T k={I18nKey.APPS$MAPS_OPENSTREETMAP} /></a>{" "}<T k={I18nKey.APPS$MAPS_CONTRIBUTORS_ROUTING_BY} />{" "}
          <a href="https://project-osrm.org/" target="_blank" rel="noopener noreferrer">
            OSRM
          </a>
        </div>
      </div>
    </div>
  );
}
