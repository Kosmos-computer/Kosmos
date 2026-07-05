/**
 * Settings → Apps — the permission surface of the app platform: per-app
 * grant toggles (the bridge enforces these on every call), enable/disable,
 * uninstall, and install-from-URL. Core apps arrive pre-granted as seeds;
 * anything can be revoked here and the denial is enforced + audited.
 */
import { useState } from "react";
import { ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import type { InstalledAppInfo, GrantState } from "@shared/manifest";
import { describePermissionKey } from "@shared/manifest";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import { useOsStore } from "../../os/osStore";

function GrantRow({
  app,
  grantKey,
  state,
  canManage,
  onChanged,
}: {
  app: InstalledAppInfo;
  grantKey: string;
  state: GrantState;
  canManage: boolean;
  onChanged: () => void;
}) {
  const granted = state === "granted";
  const toggle = async () => {
    await api.setAppGrant(app.manifest.id, grantKey, granted ? "denied" : "granted");
    onChanged();
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {granted ? (
        <ShieldCheck size={14} style={{ color: "var(--arco-success)", flexShrink: 0 }} />
      ) : (
        <ShieldOff size={14} style={{ color: "var(--arco-text-tertiary)", flexShrink: 0 }} />
      )}
      <span style={{ flex: 1, fontSize: "var(--arco-text-sm)" }}>
        {describePermissionKey(grantKey)}
      </span>
      {canManage && (
        <button
          className={`arco-chip ${granted ? "arco-chip--active" : ""}`}
          onClick={() => void toggle()}
          aria-pressed={granted}
        >
          {granted ? "granted" : "denied"}
        </button>
      )}
    </div>
  );
}

export function AppsSection() {
  const installedApps = useOsStore((s) => s.installedApps);
  const refreshApps = useOsStore((s) => s.refreshApps);
  const canManage = useCan("apps:manage");
  const [installUrl, setInstallUrl] = useState("");
  const [installError, setInstallError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);

  const install = async () => {
    if (!installUrl.trim()) return;
    setInstalling(true);
    setInstallError(null);
    try {
      await api.installApp({ url: installUrl.trim() });
      setInstallUrl("");
      await refreshApps();
    } catch (err) {
      setInstallError(err instanceof Error ? err.message : "Install failed");
    } finally {
      setInstalling(false);
    }
  };

  const setEnabled = async (app: InstalledAppInfo, enabled: boolean) => {
    await api.setAppEnabled(app.manifest.id, enabled);
    await refreshApps();
  };

  const uninstall = async (app: InstalledAppInfo) => {
    if (!window.confirm(`Uninstall ${app.manifest.name}? Its grants are removed too.`)) return;
    await api.uninstallApp(app.manifest.id);
    await refreshApps();
  };

  return (
    <section className="arco-form">
      <strong>Apps & permissions</strong>

      {installedApps.length === 0 && (
        <span style={{ color: "var(--arco-text-tertiary)", fontSize: "var(--arco-text-sm)" }}>
          No apps installed.
        </span>
      )}

      {installedApps.map((app) => (
        <div
          key={app.manifest.id}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "10px 12px",
            border: "1px solid var(--arco-border)",
            borderRadius: "var(--arco-radius-md, 8px)",
            opacity: app.enabled ? 1 : 0.6,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <strong style={{ fontSize: "var(--arco-text-md)" }}>{app.manifest.name}</strong>
            <span style={{ color: "var(--arco-text-tertiary)", fontSize: "var(--arco-text-xs)" }}>
              v{app.manifest.version} · {app.manifest.tier} · {app.source}
            </span>
            <span style={{ flex: 1 }} />
            {canManage && (
              <>
                <button
                  className={`arco-chip ${app.enabled ? "arco-chip--active" : ""}`}
                  onClick={() => void setEnabled(app, !app.enabled)}
                  aria-pressed={app.enabled}
                >
                  {app.enabled ? "enabled" : "disabled"}
                </button>
                <button
                  className="arco-btn arco-btn--icon"
                  onClick={() => void uninstall(app)}
                  aria-label={`Uninstall ${app.manifest.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
          {app.manifest.description && (
            <span style={{ color: "var(--arco-text-secondary)", fontSize: "var(--arco-text-sm)" }}>
              {app.manifest.description}
            </span>
          )}
          {Object.keys(app.grants).length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(app.grants).map(([key, state]) => (
                <GrantRow
                  key={key}
                  app={app}
                  grantKey={key}
                  state={state}
                  canManage={canManage}
                  onChanged={() => void refreshApps()}
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {canManage && (
        <>
          <label className="arco-label" htmlFor="app-install-url">
            Install from manifest URL
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="app-install-url"
              className="arco-input"
              style={{ flex: 1 }}
              placeholder="https://example.com/my-app/manifest.json"
              value={installUrl}
              onChange={(e) => setInstallUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void install()}
            />
            <button
              className="arco-btn arco-btn--primary"
              disabled={installing || !installUrl.trim()}
              onClick={() => void install()}
            >
              {installing ? "Installing…" : "Install"}
            </button>
          </div>
          {installError && (
            <span style={{ color: "var(--arco-danger, #e5484d)", fontSize: "var(--arco-text-sm)" }}>
              {installError}
            </span>
          )}
        </>
      )}
    </section>
  );
}
