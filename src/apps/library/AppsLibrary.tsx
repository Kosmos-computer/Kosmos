import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Apps library — launcher for every app on the shell (system, installed,
 * generated, and web) plus generated-app lifecycle actions (refine, version
 * history, restore, delete).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Clock,
  EllipsisVertical,
  ExternalLink,
  LayoutGrid,
  List,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { AppSummary, StoredApp, WebApp } from "@shared/types";
import { Menu, type MenuItem } from "../../components/Menu";
import { ListSearch } from "../../components/patterns";
import { matchesListSearch } from "../../lib/listSearch";
import { api } from "../../lib/api";
import { useOsStore } from "../../os/osStore";
import { useShellApps, type ShellAppEntry } from "../../os/shellApps";
import { useWindowStore } from "../../os/windowStore";
import { primeComposer } from "../chat/composerBus";

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

function iconMarkStyle(seed: string): CSSProperties {
  const hue = iconHue(seed);
  return {
    background: `hsl(${hue} 68% 52%)`,
  };
}

function ViewToggle({ view, onChange }: { view: LibraryView; onChange: (view: LibraryView) => void }) {
  return (
    <div className="arco-chip-row" role="group" aria-label={i18n.t(I18nKey.APPS$LIBRARY_APPS_VIEW)}>
      <button
        type="button"
        className={`arco-chip${view === "icons" ? " arco-chip--active" : ""}`}
        aria-pressed={view === "icons"}
        onClick={() => onChange("icons")}
      >
        <LayoutGrid size={13} aria-hidden="true" /><T k={I18nKey.APPS$LIBRARY_ICONS} /></button>
      <button
        type="button"
        className={`arco-chip${view === "list" ? " arco-chip--active" : ""}`}
        aria-pressed={view === "list"}
        onClick={() => onChange("list")}
      >
        <List size={13} aria-hidden="true" /><T k={I18nKey.APPS$LIBRARY_LIST} /></button>
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
      aria-label={`Open ${label}`}
      onClick={onOpen}
    >
      <span className="arco-apps-home__glyph-mark" style={iconMarkStyle(seed)} aria-hidden="true">
        <Icon size={20} strokeWidth={2.25} />
      </span>
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
  const shellApps = useShellApps();
  const openWindow = useWindowStore((s) => s.open);
  const closeWindow = useWindowStore((s) => s.close);
  const appsWindowFocused = useWindowStore((s) => {
    const focused = s.windows
      .filter((window) => !window.minimized)
      .reduce<(typeof s.windows)[number] | null>(
        (top, window) => (!top || window.z > top.z ? window : top),
        null,
      );
    return focused?.id === "system:apps";
  });
  const appsWindowLayout = useWindowStore((s) => {
    const window = s.windows.find((entry) => entry.id === "system:apps");
    return window ? `${window.w}:${window.h}:${window.maximized}` : "closed";
  });
  const [historyApp, setHistoryApp] = useState<StoredApp | null>(null);
  const [view, setView] = useLibraryView();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [versionSearch, setVersionSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const appItemRefs = useRef(new Map<string, HTMLDivElement>());

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

  const menuItemsForEntry = useCallback(
    (entry: ShellAppEntry): MenuItem[] => {
      const { kind } = entry;
      if (kind.type === "generated") {
        const app = apps.find((a) => a.id === kind.appId);
        if (app) return generatedMenuItems(app);
      }
      if (kind.type === "web") {
        const app = webApps.find((a) => a.id === kind.webAppId);
        if (app) return webMenuItems(app);
      }
      return [
        {
          id: "open",
          label: "Open",
          icon: ExternalLink,
          onSelect: () => openWindow(kind, entry.title),
        },
      ];
    },
    [apps, webApps, generatedMenuItems, openWindow, webMenuItems],
  );

  const filteredShellApps = useMemo(
    () =>
      shellApps.filter((entry) => {
        const { kind } = entry;
        let generatedTitle: string | undefined;
        let webName: string | undefined;
        let webUrl: string | undefined;
        if (kind.type === "generated") {
          generatedTitle = apps.find((a) => a.id === kind.appId)?.title;
        } else if (kind.type === "web") {
          const web = webApps.find((a) => a.id === kind.webAppId);
          webName = web?.name;
          webUrl = web?.url;
        }
        return matchesListSearch(
          searchQuery,
          entry.title,
          entry.id,
          generatedTitle,
          webName,
          webUrl,
          kind.type,
        );
      }),
    [shellApps, searchQuery, apps, webApps],
  );
  const activeAppId = filteredShellApps.some((entry) => entry.id === selectedAppId)
    ? selectedAppId
    : filteredShellApps[0]?.id ?? null;

  useEffect(() => {
    if (!appsWindowFocused || historyApp) return;
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [appsWindowFocused, appsWindowLayout, historyApp]);

  useEffect(() => {
    if (!activeAppId) return;
    appItemRefs.current.get(activeAppId)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeAppId]);

  const onAppSearchKeyDown = useCallback(
    (event: { key: string; preventDefault: () => void }) => {
      if (event.key === "Enter") {
        const entry = filteredShellApps.find((app) => app.id === activeAppId);
        if (!entry) return;
        event.preventDefault();
        openWindow(entry.kind, entry.title);
        return;
      }

      const navigationKeys = view === "icons"
        ? ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"]
        : ["ArrowDown", "ArrowUp"];
      if (!navigationKeys.includes(event.key)) return;
      if (filteredShellApps.length === 0) return;
      event.preventDefault();
      const currentIndex = filteredShellApps.findIndex((entry) => entry.id === activeAppId);
      let nextIndex = currentIndex;

      if (view === "icons") {
        const currentNode = activeAppId ? appItemRefs.current.get(activeAppId) : undefined;
        if (currentNode) {
          const currentRect = currentNode.getBoundingClientRect();
          const currentX = currentRect.left + currentRect.width / 2;
          const currentY = currentRect.top + currentRect.height / 2;
          const vertical = event.key === "ArrowDown" || event.key === "ArrowUp";
          const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
          let best: { index: number; score: number } | null = null;

          for (const [index, entry] of filteredShellApps.entries()) {
            if (index === currentIndex) continue;
            const node = appItemRefs.current.get(entry.id);
            if (!node) continue;
            const rect = node.getBoundingClientRect();
            const deltaX = rect.left + rect.width / 2 - currentX;
            const deltaY = rect.top + rect.height / 2 - currentY;
            const primary = vertical ? deltaY : deltaX;
            const cross = vertical ? Math.abs(deltaX) : Math.abs(deltaY);
            if ((forward && primary <= 1) || (!forward && primary >= -1)) continue;
            if (!vertical && cross > currentRect.height / 2) continue;

            const score = Math.abs(primary) * 1_000 + cross;
            if (!best || score < best.score) best = { index, score };
          }

          if (best) nextIndex = best.index;
        }
      } else if (event.key === "ArrowDown" && currentIndex + 1 < filteredShellApps.length) {
        nextIndex = currentIndex + 1;
      } else if (event.key === "ArrowUp" && currentIndex > 0) {
        nextIndex = currentIndex - 1;
      }

      setSelectedAppId(filteredShellApps[nextIndex]?.id ?? null);
    },
    [activeAppId, filteredShellApps, openWindow, view],
  );

  useEffect(() => {
    if (!appsWindowFocused || historyApp) return;
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.target === searchInputRef.current) return;
      const interactiveTarget = event.target instanceof Element
        ? event.target.closest("button, a, textarea, select, [contenteditable='true'], [role='menu']")
        : null;
      if (interactiveTarget?.closest(".arco-menu__panel")) return;
      if (event.key === "Enter" && interactiveTarget) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!["Enter", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      searchInputRef.current?.focus({ preventScroll: true });
      onAppSearchKeyDown(event);
    };
    document.addEventListener("keydown", onDocumentKeyDown, true);
    return () => document.removeEventListener("keydown", onDocumentKeyDown, true);
  }, [appsWindowFocused, historyApp, onAppSearchKeyDown]);

  if (historyApp) {
    const reversedVersions = [...historyApp.versions].reverse().map((v, revIdx) => ({
      v,
      realIdx: historyApp.versions.length - 1 - revIdx,
    }));
    const versions = reversedVersions.filter(({ v }) =>
      matchesListSearch(versionSearch, v.source, v.content, new Date(v.timestamp).toLocaleString()),
    );

    return (
      <div className="arco-panel arco-scroll">
        <div className="arco-panel__header">
          <strong>{historyApp.title}<T k={I18nKey.APPS$LIBRARY_VERSIONS} /></strong>
          <button className="arco-btn" onClick={() => setHistoryApp(null)}><T k={I18nKey.COMMON$BACK} /></button>
        </div>
        <div className="arco-panel__search">
          <ListSearch
            value={versionSearch}
            onChange={setVersionSearch}
            placeholder={i18n.t(I18nKey.APPS$LIBRARY_SEARCH_VERSIONS)}
            ariaLabel="Search versions"
          />
        </div>
        {versions.length === 0 && <div className="arco-empty"><T k={I18nKey.APPS$LIBRARY_NO_VERSIONS_MATCH_YOUR_SEARCH} /></div>}
        {versions.map(({ v, realIdx }) => (
          <div key={realIdx} className="arco-listrow">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "var(--arco-text-sm)" }}>
                {v.source} · {new Date(v.timestamp).toLocaleString()}
              </div>
              <div className="arco-listrow__sub">{v.content.slice(0, 120)}…</div>
            </div>
            <button className="arco-btn" onClick={() => void restore(historyApp.id, realIdx)}><T k={I18nKey.APPS$LIBRARY_RESTORE} /></button>
          </div>
        ))}
      </div>
    );
  }

  const noUserApps = apps.length === 0 && webApps.length === 0;

  return (
    <div className={`arco-panel${view === "icons" ? " arco-panel--apps-launcher" : " arco-scroll"}`}>
      <div className="arco-panel__header">
        <strong><T k={I18nKey.APPS$LIBRARY_APPS} /></strong>
        <ViewToggle view={view} onChange={setView} />
      </div>

      <div className="arco-panel__search">
        <ListSearch
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setSelectedAppId(null);
          }}
          placeholder={i18n.t(I18nKey.APPS$LIBRARY_SEARCH_APPS)}
          ariaLabel="Search apps"
          className="arco-apps-picker__search"
          autoFocus
          inputRef={searchInputRef}
          onKeyDown={onAppSearchKeyDown}
        />
      </div>

      {view === "icons" ? (
        <div className="arco-apps-home arco-scroll">
          <section className="arco-apps-home__section" aria-label={i18n.t(I18nKey.APPS$LIBRARY_ALL_APPS)}>
            <div className="arco-apps-home__grid">
              {filteredShellApps.map((entry) => {
                const Icon = entry.icon;
                return (
                  <div
                    key={entry.id}
                    ref={(node) => {
                      if (node) appItemRefs.current.set(entry.id, node);
                      else appItemRefs.current.delete(entry.id);
                    }}
                    className={`arco-apps-home__tile${entry.id === activeAppId ? " arco-apps-home__tile--active" : ""}`}
                    onMouseEnter={() => setSelectedAppId(entry.id)}
                    onFocusCapture={() => setSelectedAppId(entry.id)}
                  >
                    <AppIconGlyph
                      Icon={Icon}
                      seed={entry.id}
                      label={entry.title}
                      onOpen={() => openWindow(entry.kind, entry.title)}
                    />
                    <AppNameMenu label={entry.title} items={menuItemsForEntry(entry)} />
                  </div>
                );
              })}
            </div>
          </section>

          {noUserApps && (
            <p className="arco-apps-home__hint">
              <Sparkles size={14} aria-hidden="true" /><T k={I18nKey.APPS$LIBRARY_ASK_ARCO_TO_BUILD_AN_APP_IN_CHAT_OR_ADD_A_PROJECT_FROM_S} /></p>
          )}
        </div>
      ) : (
        <>
          <div className="arco-label"><T k={I18nKey.APPS$LIBRARY_ALL_APPS} /></div>
          {filteredShellApps.length === 0 ? (
            <div className="arco-empty"><T k={I18nKey.APPS$LIBRARY_NO_APPS_MATCH_YOUR_SEARCH} /></div>
          ) : null}
          {filteredShellApps.map((entry) => {
            const Icon = entry.icon;
            const { kind } = entry;
            const generated = kind.type === "generated" ? apps.find((a) => a.id === kind.appId) : undefined;
            const web = kind.type === "web" ? webApps.find((a) => a.id === kind.webAppId) : undefined;
            return (
              <div
                key={entry.id}
                ref={(node) => {
                  if (node) appItemRefs.current.set(entry.id, node);
                  else appItemRefs.current.delete(entry.id);
                }}
                className={`arco-listrow${entry.id === activeAppId ? " arco-listrow--active" : ""}`}
                onMouseEnter={() => setSelectedAppId(entry.id)}
                onFocusCapture={() => setSelectedAppId(entry.id)}
              >
                <Icon size={16} style={{ color: "var(--arco-accent)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "var(--arco-text-sm)" }}>{entry.title}</div>
                  <div className="arco-listrow__sub">
                    {generated
                      ? `updated ${new Date(generated.updatedAt).toLocaleString()} · ${generated.versionCount} version${generated.versionCount === 1 ? "" : "s"}`
                      : web
                        ? web.url + (web.command ? ` · ${web.command}` : "")
                        : kind.type === "installed"
                          ? "Installed app"
                          : "Built-in app"}
                  </div>
                </div>
                <button className="arco-btn" onClick={() => openWindow(kind, entry.title)}>
                  <ExternalLink size={13} /><T k={I18nKey.COMMON$OPEN} /></button>
                {generated && (
                  <>
                    <button className="arco-btn" onClick={() => refine(generated.id, generated.title)}>
                      <Sparkles size={13} /><T k={I18nKey.APPS$LIBRARY_REFINE} /></button>
                    <button
                      className="arco-btn"
                      onClick={() => void showHistory(generated.id)}
                      aria-label={i18n.t(I18nKey.APPS$LIBRARY_VERSION_HISTORY)}
                    >
                      <Clock size={13} />
                    </button>
                    <button
                      className="arco-btn arco-btn--danger"
                      onClick={() => void remove(generated.id)}
                      aria-label={`Delete ${generated.title}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
                {web && (
                  <button
                    className="arco-btn arco-btn--danger"
                    onClick={() => void removeWebApp(web.id)}
                    aria-label={`Remove ${web.name} from the registry`}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}

          {noUserApps && (
            <p className="arco-apps-home__hint">
              <Sparkles size={14} aria-hidden="true" /><T k={I18nKey.APPS$LIBRARY_ASK_ARCO_TO_BUILD_AN_APP_IN_CHAT_OR_ADD_A_PROJECT_FROM_S} /></p>
          )}
        </>
      )}
    </div>
  );
}
