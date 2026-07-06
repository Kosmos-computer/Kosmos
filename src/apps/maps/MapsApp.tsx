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
  const maps = useMaps();
  const selected = maps.results.find((p) => p.id === maps.selectedId) ?? null;

  return (
    <div className="arco-maps">
      <aside className="arco-maps__history-nav" aria-label="Maps session history">
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
                  placeholder="Search places or addresses"
                  aria-label="Search places"
                />
                {maps.query ? (
                  <Button
                    variant="ghost"
                    className="arco-btn--icon arco-maps__clear"
                    aria-label="Clear search"
                    onClick={() => maps.setQuery("")}
                  >
                    <X size={16} />
                  </Button>
                ) : null}
              </div>

              <div className="arco-maps__results" role="listbox" aria-label="Search results">
                {maps.loading ? (
                  <EmptyState title="Searching…">Querying OpenStreetMap</EmptyState>
                ) : maps.error ? (
                  <EmptyState title="Search failed">{maps.error}</EmptyState>
                ) : maps.query && maps.results.length === 0 ? (
                  <EmptyState title="No results">Try a different search term or zoom the map.</EmptyState>
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
                />
                Update results when map moves
              </label>
            </>
          ) : (
            <>
              <div className="arco-maps__directions-form">
                <div className="arco-maps__endpoint">
                  <span className="arco-maps__endpoint-dot arco-maps__endpoint-dot--start" aria-hidden />
                  {maps.useCurrentLocation ? (
                    <div className="arco-maps__endpoint-current">
                      <span>Current location</span>
                      <Button
                        variant="ghost"
                        className="arco-btn--icon"
                        aria-label="Enter a start address instead"
                        title="Enter a start address instead"
                        onClick={() => maps.setUseCurrentLocation(false)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <Input
                      value={maps.fromQuery}
                      onChange={(e) => maps.setFromQuery(e.target.value)}
                      placeholder="Choose starting point"
                      aria-label="Starting point"
                    />
                  )}
                </div>

                <div className="arco-maps__endpoint">
                  <span className="arco-maps__endpoint-dot arco-maps__endpoint-dot--end" aria-hidden />
                  <Input
                    value={maps.toQuery}
                    onChange={(e) => maps.setToQuery(e.target.value)}
                    placeholder="Choose destination"
                    aria-label="Destination"
                  />
                </div>

                <div className="arco-maps__directions-actions">
                  <Button variant="ghost" className="arco-btn--icon" aria-label="Swap start and destination" onClick={maps.swapEndpoints}>
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
                      <LocateFixed size={14} aria-hidden />
                      Use my location
                    </Button>
                  ) : null}
                  <Button variant="primary" className="arco-maps__route-btn" onClick={() => void maps.getDirections()} disabled={maps.routeLoading}>
                    <Navigation size={14} aria-hidden />
                    {maps.routeLoading ? "Routing…" : "Get directions"}
                  </Button>
                </div>
              </div>

              <div className="arco-maps__results">
                {maps.routeError ? <EmptyState title="Directions failed">{maps.routeError}</EmptyState> : null}
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
                        <span className="arco-maps__result-category">From</span>
                        <span>{maps.route.from.name}</span>
                      </div>
                      <div>
                        <span className="arco-maps__result-category">To</span>
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
                  <EmptyState title="Plan a route">Enter a destination and choose Get directions.</EmptyState>
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
                <Navigation size={14} aria-hidden />
                Directions
              </Button>
              <a
                className="arco-maps__detail-link"
                href={`https://www.openstreetmap.org/?mlat=${selected.lat}&mlon=${selected.lon}#map=16/${selected.lat}/${selected.lon}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in OpenStreetMap
                <ExternalLink size={14} aria-hidden />
              </a>
            </div>
          </div>
        ) : null}

        <div className="arco-maps__attribution">
          Map data &copy;{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
            OpenStreetMap
          </a>{" "}
          contributors · Routing by{" "}
          <a href="https://project-osrm.org/" target="_blank" rel="noopener noreferrer">
            OSRM
          </a>
        </div>
      </div>
    </div>
  );
}
