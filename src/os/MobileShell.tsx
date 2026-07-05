/**
 * Mobile shell — the same windows become full-screen sheets: a home grid of
 * app icons, a bottom dock of open surfaces, one surface visible at a time.
 * This is the "adaptive at the shell level" half of the adaptivity story
 * (AdaptiveSurface handles the per-container half).
 */
import { ChevronLeft, Globe, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Bell } from "lucide-react";
import { useOsStore } from "./osStore";
import { useWindowStore } from "./windowStore";
import { SYSTEM_APPS, systemApp } from "./systemApps";
import { AppSurface } from "../apps/appview/AppSurface";
import { WebAppSurface } from "../apps/appview/WebAppSurface";

export function MobileShell() {
  const apps = useOsStore((s) => s.apps);
  const webApps = useOsStore((s) => s.webApps);
  const refreshApps = useOsStore((s) => s.refreshApps);
  const notifications = useOsStore((s) => s.notifications);
  const dismiss = useOsStore((s) => s.dismissNotification);
  const windows = useWindowStore((s) => s.windows);
  const open = useWindowStore((s) => s.open);
  const focus = useWindowStore((s) => s.focus);
  const toggleMinimize = useWindowStore((s) => s.toggleMinimize);

  useEffect(() => {
    void refreshApps();
  }, [refreshApps]);

  const active = [...windows.filter((w) => !w.minimized)].sort((a, b) => b.z - a.z)[0];

  return (
    <div className="arco-mobile-shell">
      <div className="arco-mobile-shell__surface">
        {active ? (
          <>
            <header className="arco-mobile-shell__header">
              <button onClick={() => toggleMinimize(active.id)} aria-label="Back to home">
                <ChevronLeft size={20} />
              </button>
              <strong style={{ fontSize: "var(--arco-text-md)" }}>{active.title}</strong>
            </header>
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              {active.kind.type === "system" ? (
                (() => {
                  const Component = systemApp(active.kind.app).component;
                  return <Component />;
                })()
              ) : active.kind.type === "web" ? (
                <WebAppSurface webAppId={active.kind.webAppId} />
              ) : (
                <AppSurface appId={active.kind.appId} />
              )}
            </div>
          </>
        ) : (
          <div className="arco-mobile-home">
            {SYSTEM_APPS.map((def) => {
              const Icon = def.icon;
              return (
                <button
                  key={def.id}
                  className="arco-mobile-home__icon"
                  onClick={() => open({ type: "system", app: def.id }, def.title)}
                >
                  <span className="arco-mobile-home__glyph">
                    <Icon size={26} strokeWidth={1.7} />
                  </span>
                  {def.title}
                </button>
              );
            })}
            {apps.map((app) => (
              <button
                key={app.id}
                className="arco-mobile-home__icon"
                onClick={() => open({ type: "app", appId: app.id }, app.title)}
              >
                <span className="arco-mobile-home__glyph" style={{ color: "var(--arco-accent)" }}>
                  <Sparkles size={26} strokeWidth={1.7} />
                </span>
                {app.title}
              </button>
            ))}
            {webApps.map((app) => (
              <button
                key={app.id}
                className="arco-mobile-home__icon"
                onClick={() => open({ type: "web", webAppId: app.id }, app.name)}
              >
                <span className="arco-mobile-home__glyph" style={{ color: "var(--arco-accent)" }}>
                  <Globe size={26} strokeWidth={1.7} />
                </span>
                {app.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="arco-mobile-shell__dock" aria-label="Open surfaces">
        {windows.map((w) => {
          const def =
            w.kind.type === "system" ? SYSTEM_APPS.find((a) => w.kind.type === "system" && a.id === w.kind.app) : null;
          const Icon = def?.icon ?? (w.kind.type === "web" ? Globe : Sparkles);
          const isActive = active?.id === w.id;
          return (
            <button
              key={w.id}
              onClick={() => (isActive ? toggleMinimize(w.id) : focus(w.id))}
              aria-label={w.title}
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
          <span style={{ fontSize: "var(--arco-text-xs)", color: "var(--arco-text-tertiary)", padding: 6 }}>
            Open an app to get started
          </span>
        )}
      </nav>

      {notifications.length > 0 && (
        <div className="arco-notifications" role="status" aria-live="polite">
          {notifications.map((n) => (
            <div key={n.id} className="arco-notification">
              <Bell size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ flex: 1 }}>{n.message}</span>
              <button onClick={() => dismiss(n.id)} aria-label="Dismiss notification">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
