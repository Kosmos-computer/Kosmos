import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
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
import {
  ListSearch,
  SettingsAlert,
  SettingsEmpty,
  SettingsFieldRow,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsRow,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
  SettingsSubhead,
} from "../../components/patterns";
import { Button, Chip, Input } from "../../components/ui";
import { matchesListSearch } from "../../lib/listSearch";

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
    <SettingsRow disabled={!app.enabled}>
      {granted ? (
        <ShieldCheck size={14} className="arco-icon arco-icon--success" />
      ) : (
        <ShieldOff size={14} className="arco-icon arco-icon--tertiary" />
      )}
      <span className="arco-settings-tool-row__desc">{describePermissionKey(grantKey)}</span>
      {canManage && (
        <SettingsRowActions>
          <Chip active={granted} onClick={() => void toggle()} aria-pressed={granted}>
            {granted ? "granted" : "denied"}
          </Chip>
        </SettingsRowActions>
      )}
    </SettingsRow>
  );
}

export function AppsSection() {
  const installedApps = useOsStore((s) => s.installedApps);
  const refreshApps = useOsStore((s) => s.refreshApps);
  const canManage = useCan("apps:manage");
  const [installUrl, setInstallUrl] = useState("");
  const [installError, setInstallError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredApps = installedApps.filter((app) =>
    matchesListSearch(searchQuery, app.manifest.name, app.manifest.description, app.manifest.id, app.source),
  );

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
    <SettingsPage>
      <SettingsSection intro={i18n.t(I18nKey.APPS$SETTINGS_MANAGE_INSTALLED_APPS_PERMISSIONS_AND_AGENT_TOOLS_CONTRI)}>
        {installError ? <SettingsAlert tone="error">{installError}</SettingsAlert> : null}

        {installedApps.length === 0 ? (
          <SettingsEmpty><T k={I18nKey.APPS$SETTINGS_NO_APPS_INSTALLED} /></SettingsEmpty>
        ) : (
          <>
            <ListSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={i18n.t(I18nKey.APPS$SETTINGS_SEARCH_INSTALLED_APPS)}
              ariaLabel="Search installed apps"
            />
            {filteredApps.length === 0 ? <SettingsEmpty><T k={I18nKey.APPS$SETTINGS_NO_APPS_MATCH_YOUR_SEARCH} /></SettingsEmpty> : null}
            <SettingsStack>
            {filteredApps.map((app) => (
              <SettingsPanel key={app.manifest.id} disabled={!app.enabled}>
                <SettingsPanelHeader>
                  <span className="arco-settings-panel__title">{app.manifest.name}</span>
                  <span className="arco-settings-panel__meta"><T k={I18nKey.APPS$SETTINGS_V} />{app.manifest.version} · {app.manifest.tier} · {app.source}
                  </span>
                  {canManage && (
                    <SettingsRowActions>
                      <Chip
                        active={app.enabled}
                        onClick={() => void setEnabled(app, !app.enabled)}
                        aria-pressed={app.enabled}
                      >
                        {app.enabled ? "enabled" : "disabled"}
                      </Chip>
                      <Button
                        size="icon"
                        onClick={() => void uninstall(app)}
                        aria-label={`Uninstall ${app.manifest.name}`}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </SettingsRowActions>
                  )}
                </SettingsPanelHeader>
                {app.manifest.description ? (
                  <p className="arco-settings-panel__desc">{app.manifest.description}</p>
                ) : null}
                {Object.keys(app.grants).length > 0 && (
                  <SettingsPanelBody>
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
                  </SettingsPanelBody>
                )}
                {(app.manifest.tools?.length ?? 0) > 0 && (
                  <p className="arco-settings-panel__meta"><T k={I18nKey.APPS$SETTINGS_CONTRIBUTES_AGENT_TOOLS} />{app.manifest.tools!.map((t) => t.name).join(", ")}<T k={I18nKey.APPS$SETTINGS_CALLS_RUN_UNDER_THIS_APP_APOS_S_PERMISSIONS_ABOVE} /></p>
                )}
              </SettingsPanel>
            ))}
          </SettingsStack>
          </>
        )}

        {canManage && (
          <>
            <SettingsSubhead><T k={I18nKey.APPS$SETTINGS_INSTALL_FROM_URL} /></SettingsSubhead>
            <SettingsFieldRow label={i18n.t(I18nKey.APPS$SETTINGS_MANIFEST)} htmlFor="app-install-url">
              <Input
                id="app-install-url"
                width="auto"
                placeholder="https://example.com/my-app/manifest.json"
                value={installUrl}
                onChange={(e) => setInstallUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void install()}
              />
              <Button variant="primary" disabled={installing || !installUrl.trim()} onClick={() => void install()}>
                {installing ? "Installing…" : "Install"}
              </Button>
            </SettingsFieldRow>
          </>
        )}
      </SettingsSection>
    </SettingsPage>
  );
}
