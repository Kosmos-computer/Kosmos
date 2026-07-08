import { I18nKey } from "../i18n/declaration";
import i18n from "../i18n/index";
import { T } from "../i18n/T";
/**
 * Mobile shell — the same windows become full-screen sheets: a home grid of
 * app icons, a bottom dock of open surfaces, one surface visible at a time.
 * This is the "adaptive at the shell level" half of the adaptivity story
 * (AdaptiveSurface handles the per-container half).
 */
import { ChevronLeft, Globe } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { ListSearch } from "../components/patterns";
import { matchesListSearch } from "../lib/listSearch";
import { useOsStore } from "./osStore";
import { useWindowStore } from "./windowStore";
import { focusShellWindow, openShellWindow } from "./shellNavigation";
import { useShellApps } from "./shellApps";
import { systemApp } from "./systemApps";
import { resolveWindowTitle } from "./resolveWindowTitle";
import { AppSurface } from "../apps/appview/AppSurface";
import { WebAppSurface } from "../apps/appview/WebAppSurface";
import { AppHost } from "../apps/appview/AppHost";
import { MusicShell } from "../apps/music/MusicShell";
import { MessengerShell } from "../apps/messenger/MessengerShell";
import { VideoShell } from "../apps/video/VideoShell";
import { PodcastShell } from "../apps/podcast/PodcastShell";

export function MobileShell() {
  const { i18n } = useTranslation();
  const refreshApps = useOsStore((s) => s.refreshApps);
  const shellApps = useShellApps();
  const [homeSearch, setHomeSearch] = useState("");
  const [dockSearch, setDockSearch] = useState("");
  const notifications = useOsStore((s) => s.notifications);
  const dismiss = useOsStore((s) => s.dismissNotification);
  const windows = useWindowStore((s) => s.windows);
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize);

  useEffect(() => {
    void refreshApps();
  }, [refreshApps]);

  const active = [...windows.filter((w) => !w.minimized)].sort((a, b) => b.z - a.z)[0];

  const filteredShellApps = useMemo(
    () => shellApps.filter((entry) => matchesListSearch(homeSearch, entry.title, entry.id)),
    [shellApps, homeSearch],
  );

  const filteredWindows = useMemo(
    () => windows.filter((w) => matchesListSearch(dockSearch, resolveWindowTitle(w))),
    [windows, dockSearch, i18n.language],
  );

  return (
    <div className="arco-mobile-shell">
      <div className="arco-mobile-shell__surface">
        {active ? (
          <>
            <header className="arco-mobile-shell__header">
              <button onClick={() => toggleMinimize(active.id)} aria-label={i18n.t(I18nKey.OS_MOBILESHELL_BACK_TO_HOME)}>
                <ChevronLeft size={20} />
              </button>
              <strong style={{ fontSize: "var(--arco-text-md)" }}>{resolveWindowTitle(active)}</strong>
            </header>
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              {active.kind.type === "system" ? (
                (() => {
                  const Component = systemApp(active.kind.app).component;
                  return <Component />;
                })()
              ) : active.kind.type === "web" ? (
                <WebAppSurface webAppId={active.kind.webAppId} />
              ) : active.kind.type === "installed" ? (
                <AppHost appId={active.kind.appId} />
              ) : (
                <AppSurface appId={active.kind.appId} />
              )}
            </div>
          </>
        ) : (
          <>
            <div className="arco-mobile-home__search">
              <ListSearch
                value={homeSearch}
                onChange={setHomeSearch}
                placeholder={i18n.t(I18nKey.APPS$LIBRARY_SEARCH_APPS)}
                ariaLabel="Search apps"
              />
            </div>
            <div className="arco-mobile-home">
              {filteredShellApps.length === 0 ? (
                <p className="arco-mobile-home__empty"><T k={I18nKey.OS_MOBILESHELL_NO_APPS_MATCH_YOUR_SEARCH} /></p>
              ) : null}
              {filteredShellApps.map((entry) => {
                const Icon = entry.icon;
                return (
                  <button
                    key={entry.id}
                    className="arco-mobile-home__icon"
                    onClick={() => openShellWindow(entry.kind, entry.title)}
                  >
                    <span
                      className="arco-mobile-home__glyph"
                      style={entry.generated ? { color: "var(--arco-accent)" } : undefined}
                    >
                      <Icon size={26} strokeWidth={1.7} />
                    </span>
                    {entry.title}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <nav className="arco-mobile-shell__dock" aria-label={i18n.t(I18nKey.OS_MOBILESHELL_OPEN_SURFACES)}>
        {windows.length > 3 ? (
          <div className="arco-mobile-shell__dock-search">
            <ListSearch
              value={dockSearch}
              onChange={setDockSearch}
              placeholder={i18n.t(I18nKey.OS_MOBILESHELL_FILTER_OPEN_APPS)}
              ariaLabel="Filter open apps"
              compact
            />
          </div>
        ) : null}
        {filteredWindows.map((w) => {
          const shellEntry = shellApps.find((a) => a.id === w.id);
          const Icon = shellEntry?.icon ?? Globe;
          const isActive = active?.id === w.id;
          return (
            <button
              key={w.id}
              onClick={() => (isActive ? toggleMinimize(w.id) : focusShellWindow(w.id))}
              aria-label={resolveWindowTitle(w)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                fontSize: "var(--arco-text-xs)",
                color: isActive ? "var(--arco-accent)" : "var(--arco-text-tertiary)",
                padding: "2px 10px",
              }}
            >
              <Icon size={20} strokeWidth={1.8} />
            </button>
          );
        })}
        {windows.length === 0 && (
          <span style={{ fontSize: "var(--arco-text-xs)", color: "var(--arco-text-tertiary)", padding: 6 }}><T k={I18nKey.OS_MOBILESHELL_OPEN_AN_APP_TO_GET_STARTED} /></span>
        )}
      </nav>

      {notifications.length > 0 && (
        <div className="arco-notifications" role="status" aria-live="polite">
          {notifications.map((n) => (
            <div key={n.id} className="arco-notification">
              <Bell size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ flex: 1 }}>{n.message}</span>
              <button onClick={() => dismiss(n.id)} aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_DISMISS_NOTIFICATION)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <MusicShell />
      <MessengerShell />
      <VideoShell />
      <PodcastShell />
    </div>
  );
}
