import { I18nKey } from "../i18n/declaration";
import { T } from "../i18n/T";
/**
 * Mobile shell — the same windows become full-screen sheets: a home grid of
 * app icons, a bottom dock of open surfaces, one surface visible at a time.
 *
 * Desktop view keeps status bar + dock visible unless Appearance hides them.
 * App view hides chrome by default (status bar can stay visible via Appearance);
 * edge-to-edge when hidden — swipe down for status bar,
 * swipe up for the dock — same reveal idea as UI Experiments hover chrome.
 */
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
import { AppSurface } from "../apps/appview/AppSurface";
import { WebAppSurface } from "../apps/appview/WebAppSurface";
import { AppHost } from "../apps/appview/AppHost";
import { MusicShell } from "../apps/music/MusicShell";
import { MessengerShell } from "../apps/messenger/MessengerShell";
import { VideoShell } from "../apps/video/VideoShell";
import { PodcastShell } from "../apps/podcast/PodcastShell";
import { MobileStatusBar } from "./MobileStatusBar";
import { MobileDock } from "./MobileDock";
import { connectShellEvents } from "./shellEvents";
import { SwipeRevealTray } from "./SwipeRevealTray";

export function MobileShell() {
  const { i18n } = useTranslation();
  const refreshApps = useOsStore((s) => s.refreshApps);
  const shellView = useOsStore((s) => s.shellView);
  const dockVisible = useOsStore((s) => s.dockVisible);
  const menuBarVisible = useOsStore((s) => s.menuBarVisible);
  const menuBarVisibleInAppView = useOsStore((s) => s.menuBarVisibleInAppView);
  const shellApps = useShellApps();
  const [homeSearch, setHomeSearch] = useState("");
  const notifications = useOsStore((s) => s.notifications);
  const dismiss = useOsStore((s) => s.dismissNotification);
  const windows = useWindowStore((s) => s.windows);
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize);

  const appView = shellView === "app";
  const hideMenuBar = appView ? !menuBarVisibleInAppView : !menuBarVisible;
  const hideDock = appView || !dockVisible;

  useEffect(() => {
    void refreshApps();
    // Voice /v1 turns need this channel for cursor tools + approvals.
    const disconnect = connectShellEvents();
    return disconnect;
  }, [refreshApps]);

  const active = [...windows.filter((w) => !w.minimized)].sort((a, b) => b.z - a.z)[0];

  const filteredShellApps = useMemo(
    () => shellApps.filter((entry) => matchesListSearch(homeSearch, entry.title, entry.id)),
    [shellApps, homeSearch],
  );

  const statusBar = (
    <MobileStatusBar
      active={active}
      onBack={active ? () => toggleMinimize(active.id) : undefined}
    />
  );

  const dock = (
    <MobileDock
      windows={windows}
      active={active}
      onFocus={focusShellWindow}
      onToggleMinimize={toggleMinimize}
    />
  );

  return (
    <div
      className={[
        "arco-mobile-shell",
        hideMenuBar || hideDock
          ? "arco-mobile-shell--app-view"
          : "arco-mobile-shell--desktop-view",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hideMenuBar ? (
        <SwipeRevealTray
          edge="top"
          enabled
          zoneLabel={i18n.t(I18nKey.OS_MOBILESHELL_SWIPE_STATUS_BAR)}
        >
          {statusBar}
        </SwipeRevealTray>
      ) : (
        statusBar
      )}

      <div className="arco-mobile-shell__surface">
        {active ? (
          <div className="arco-mobile-shell__app">
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
                <p className="arco-mobile-home__empty">
                  <T k={I18nKey.OS_MOBILESHELL_NO_APPS_MATCH_YOUR_SEARCH} />
                </p>
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

      {hideDock ? (
        <SwipeRevealTray
          edge="bottom"
          enabled
          zoneLabel={i18n.t(I18nKey.OS_MOBILESHELL_SWIPE_DOCK)}
        >
          {dock}
        </SwipeRevealTray>
      ) : (
        dock
      )}

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
