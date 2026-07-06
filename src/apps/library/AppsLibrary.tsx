/**
 * Apps library — every generated app (open, refine, version history with
 * non-destructive restore — the openclaw-os app lifecycle) plus registered
 * web apps (user projects mounted on the dock).
 */
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  Clock,
  EllipsisVertical,
  ExternalLink,
  Globe,
  LayoutGrid,
  List,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { AppSummary, StoredApp, WebApp } from "@shared/types";
import { Menu, type MenuItem } from "../../components/Menu";
import { api } from "../../lib/api";
import { useOsStore } from "../../os/osStore";
import { useWindowStore } from "../../os/windowStore";
import { primeComposer } from "../chat/composerBus";
import { appIcon } from "../appview/appIcon";

type LibraryView = "list" | "icons";

const VIEW_KEY = "arco:apps-view";

function useLibraryView(): [LibraryView, (view: LibraryView) => void] {
  const [view, setView] = useState<LibraryView>(() => {
    const stored = localStorage.getItem(VIEW_KEY);
    return stored === "list" || stored === "icons" ? stored : "icons";
  });
  const set = useCallback((next: LibraryView) => {
    localStorage.setItem(VIEW_KEY, next);
    setView(next);
  }, []);
  return [view, set];
}

function iconHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

function iconTileStyle(seed: string): CSSProperties {
  const hue = iconHue(seed);
  return {
    background: `linear-gradient(145deg, hsl(${hue} 62% 52%) 0%, hsl(${(hue + 28) % 360} 48% 38%) 100%)`,
    color: "#fff",
  };
}

function ViewToggle({ view, onChange }: { view: LibraryView; onChange: (view: LibraryView) => void }) {
  return (
    <div className="arco-chip-row" role="group" aria-label="Apps view">
      <button
        type="button"
        className={`arco-chip${view === "icons" ? " arco-chip--active" : ""}`}
        aria-pressed={view === "icons"}
        onClick={() => onChange("icons")}
      >
        <LayoutGrid size={13} aria-hidden="true" /> Icons
      </button>
      <button
        type="button"
        className={`arco-chip${view === "list" ? " arco-chip--active" : ""}`}
        aria-pressed={view === "list"}
        onClick={() => onChange("list")}
      >
        <List size={13} aria-hidden="true" /> List
      </button>
    </div>
  );
}

function AppIconGlyph({
  Icon,
  seed,
  label,
  onOpen,
}: {
  Icon: LucideIcon;
  seed: string;
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="arco-apps-home__glyph"
      style={iconTileStyle(seed)}
      aria-label={`Open ${label}`}
      onClick={onOpen}
    >
      <Icon size={28} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

function AppNameMenu({
  label,
  items,
}: {
  label: string;
  items: MenuItem[];
}) {
  return (
    <Menu
      align="start"
      side="bottom"
      aria-label={`${label} options`}
      items={items}
      className="arco-apps-home__menu"
      trigger={
        <button type="button" className="arco-apps-home__label" aria-label={`${label} options`}>
          <span className="arco-apps-home__name">{label}</span>
          <span className="arco-apps-home__more" aria-hidden="true">
            <EllipsisVertical size={12} />
          </span>
        </button>
      }
    />
  );
}

export function AppsLibrary() {
  const apps = useOsStore((s) => s.apps);
  const webApps = useOsStore((s) => s.webApps);
  const refreshApps = useOsStore((s) => s.refreshApps);
  const openWindow = useWindowStore((s) => s.open);
  const closeWindow = useWindowStore((s) => s.close);
  const [historyApp, setHistoryApp] = useState<StoredApp | null>(null);
  const [view, setView] = useLibraryView();

  useEffect(() => {
    void refreshApps();
  }, [refreshApps]);

  const openApp = useCallback(
    (id: string, title: string) => openWindow({ type: "generated", appId: id }, title),
    [openWindow],
  );

  const openWebApp = useCallback(
    (id: string, name: string) => openWindow({ type: "web", webAppId: id }, name),
    [openWindow],
  );

  const refine = useCallback(
    (id: string, title: string) => {
      openWindow({ type: "system", app: "chat" }, "Chat");
      primeComposer({ text: `Refine app "${title}" (id: ${id}): `, submit: false });
    },
    [openWindow],
  );

  const remove = useCallback(
    async (id: string) => {
      await api.deleteApp(id);
      closeWindow(`app:${id}`);
      void refreshApps();
    },
    [refreshApps, closeWindow],
  );

  const removeWebApp = useCallback(
    async (id: string) => {
      await api.removeWebApp(id);
      closeWindow(`web:${id}`);
      void refreshApps();
    },
    [refreshApps, closeWindow],
  );

  const showHistory = useCallback(async (id: string) => {
    setHistoryApp(await api.getApp(id));
  }, []);

  const restore = useCallback(
    async (id: string, versionIndex: number) => {
      await api.restoreApp(id, versionIndex);
      setHistoryApp(await api.getApp(id));
      void refreshApps();
    },
    [refreshApps],
  );

  const generatedMenuItems = useCallback(
    (app: AppSummary): MenuItem[] => [
      { id: "open", label: "Open", icon: ExternalLink, onSelect: () => openApp(app.id, app.title) },
      { id: "refine", label: "Refine", icon: Sparkles, onSelect: () => refine(app.id, app.title) },
      {
        id: "history",
        label: "Version history",
        icon: Clock,
        onSelect: () => void showHistory(app.id),
      },
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        danger: true,
        separatorAbove: true,
        onSelect: () => void remove(app.id),
      },
    ],
    [openApp, refine, remove, showHistory],
  );

  const webMenuItems = useCallback(
    (app: WebApp): MenuItem[] => [
      { id: "open", label: "Open", icon: ExternalLink, onSelect: () => openWebApp(app.id, app.name) },
      {
        id: "remove",
        label: "Remove from dock",
        icon: Trash2,
        danger: true,
        separatorAbove: true,
        onSelect: () => void removeWebApp(app.id),
      },
    ],
    [openWebApp, removeWebApp],
  );

  if (historyApp) {
    return (
      <div className="arco-panel arco-scroll">
        <div className="arco-panel__header">
          <strong>{historyApp.title} — versions</strong>
          <button className="arco-btn" onClick={() => setHistoryApp(null)}>
            Back
          </button>
        </div>
        {historyApp.versions.length === 0 && <div className="arco-empty">No prior versions</div>}
        {[...historyApp.versions].reverse().map((v, revIdx) => {
          const realIdx = historyApp.versions.length - 1 - revIdx;
          return (
            <div key={realIdx} className="arco-listrow">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "var(--arco-text-sm)" }}>
                  {v.source} · {new Date(v.timestamp).toLocaleString()}
                </div>
                <div className="arco-listrow__sub">{v.content.slice(0, 120)}…</div>
              </div>
              <button className="arco-btn" onClick={() => void restore(historyApp.id, realIdx)}>
                Restore
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  const empty = apps.length === 0 && webApps.length === 0;

  return (
    <div className="arco-panel arco-scroll">
      <div className="arco-panel__header">
        <strong>Apps</strong>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {empty && (
        <div className="arco-empty">
          <Sparkles size={22} />
          <span>No apps yet — ask Arco to build one in Chat, or add a project from the Studio's Browser tab.</span>
        </div>
      )}

      {view === "icons" ? (
        <div className="arco-apps-home arco-scroll">
          {apps.length > 0 && (
            <section className="arco-apps-home__section" aria-label="Generated apps">
              {webApps.length > 0 && <div className="arco-apps-home__sectionlabel">Generated</div>}
              <div className="arco-apps-home__grid">
                {apps.map((app) => {
                  const Icon = appIcon(app.icon);
                  return (
                    <div key={app.id} className="arco-apps-home__tile">
                      <AppIconGlyph
                        Icon={Icon}
                        seed={app.id}
                        label={app.title}
                        onOpen={() => openApp(app.id, app.title)}
                      />
                      <AppNameMenu label={app.title} items={generatedMenuItems(app)} />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {webApps.length > 0 && (
            <section className="arco-apps-home__section" aria-label="Your projects">
              {apps.length > 0 && <div className="arco-apps-home__sectionlabel">Projects</div>}
              <div className="arco-apps-home__grid">
                {webApps.map((app) => (
                  <div key={app.id} className="arco-apps-home__tile">
                    <AppIconGlyph
                      Icon={Globe}
                      seed={app.id}
                      label={app.name}
                      onOpen={() => openWebApp(app.id, app.name)}
                    />
                    <AppNameMenu label={app.name} items={webMenuItems(app)} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <>
          {apps.length > 0 && <div className="arco-label">Generated apps</div>}
          {apps.map((app) => {
            const Icon = appIcon(app.icon);
            return (
              <div key={app.id} className="arco-listrow">
                <Icon size={16} style={{ color: "var(--arco-accent)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "var(--arco-text-sm)" }}>{app.title}</div>
                  <div className="arco-listrow__sub">
                    updated {new Date(app.updatedAt).toLocaleString()} · {app.versionCount} version
                    {app.versionCount === 1 ? "" : "s"}
                  </div>
                </div>
                <button className="arco-btn" onClick={() => openApp(app.id, app.title)}>
                  <ExternalLink size={13} /> Open
                </button>
                <button className="arco-btn" onClick={() => refine(app.id, app.title)}>
                  <Sparkles size={13} /> Refine
                </button>
                <button className="arco-btn" onClick={() => void showHistory(app.id)} aria-label="Version history">
                  <Clock size={13} />
                </button>
                <button
                  className="arco-btn arco-btn--danger"
                  onClick={() => void remove(app.id)}
                  aria-label={`Delete ${app.title}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}

          {webApps.length > 0 && <div className="arco-label">Your projects</div>}
          {webApps.map((app) => (
            <div key={app.id} className="arco-listrow">
              <Globe size={16} style={{ color: "var(--arco-accent)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "var(--arco-text-sm)" }}>{app.name}</div>
                <div className="arco-listrow__sub">
                  {app.url}
                  {app.command ? ` · ${app.command}` : ""}
                </div>
              </div>
              <button className="arco-btn" onClick={() => openWebApp(app.id, app.name)}>
                <ExternalLink size={13} /> Open
              </button>
              <button
                className="arco-btn arco-btn--danger"
                onClick={() => void removeWebApp(app.id)}
                aria-label={`Remove ${app.name} from the registry`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
