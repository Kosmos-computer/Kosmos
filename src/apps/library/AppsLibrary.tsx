/**
 * Apps library — every generated app (open, refine, version history with
 * non-destructive restore — the openclaw-os app lifecycle) plus registered
 * web apps (user projects mounted on the dock).
 */
import { useCallback, useEffect, useState } from "react";
import { Clock, ExternalLink, Globe, Sparkles, Trash2 } from "lucide-react";
import type { StoredApp } from "@shared/types";
import { api } from "../../lib/api";
import { useOsStore } from "../../os/osStore";
import { useWindowStore } from "../../os/windowStore";
import { primeComposer } from "../chat/composerBus";

export function AppsLibrary() {
  const apps = useOsStore((s) => s.apps);
  const webApps = useOsStore((s) => s.webApps);
  const refreshApps = useOsStore((s) => s.refreshApps);
  const openWindow = useWindowStore((s) => s.open);
  const closeWindow = useWindowStore((s) => s.close);
  const [historyApp, setHistoryApp] = useState<StoredApp | null>(null);

  useEffect(() => {
    void refreshApps();
  }, [refreshApps]);

  const openApp = useCallback(
    (id: string, title: string) => openWindow({ type: "app", appId: id }, title),
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

  return (
    <div className="arco-panel arco-scroll">
      {apps.length === 0 && webApps.length === 0 && (
        <div className="arco-empty">
          <Sparkles size={22} />
          <span>No apps yet — ask Arco to build one in Chat, or add a project from the Studio's Browser tab.</span>
        </div>
      )}
      {apps.length > 0 && <div className="arco-label">Generated apps</div>}
      {apps.map((app) => (
        <div key={app.id} className="arco-listrow">
          <Sparkles size={16} style={{ color: "var(--arco-accent)", flexShrink: 0 }} />
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
      ))}

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
          <button
            className="arco-btn"
            onClick={() => openWindow({ type: "web", webAppId: app.id }, app.name)}
          >
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
    </div>
  );
}
