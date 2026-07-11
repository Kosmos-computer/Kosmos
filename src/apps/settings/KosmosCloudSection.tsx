/**
 * Settings → Kosmos Cloud — desktop thin-client connect to a hosted tenant.
 */
import { useCallback, useState } from "react";
import { Cloud, Link2, Unplug } from "lucide-react";
import { useDeployment } from "../../hooks/useDeployment";
import { desktopUsesCloudProfile } from "../../os/server/cloudShellMode";
import {
  SettingsAlert,
  SettingsFieldRow,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsRow,
  SettingsRowActions,
  SettingsRowMeta,
  SettingsSection,
  SettingsStack,
} from "../../components/patterns";
import { Button, Input } from "../../components/ui";
import {
  activateServerProfile,
  clearActiveServerProfile,
  getActiveServerProfile,
  listServerProfiles,
  normalizeServerUrl,
  reloadForServerSwitch,
  removeServerProfile,
  testServerConnection,
  upsertServerProfile,
} from "../../os/server/serverProfileStore";
import type { ServerProfile } from "../../os/server/serverProfileTypes";

export function KosmosCloudSection() {
  const { deployment } = useDeployment();
  const [profiles, setProfiles] = useState<ServerProfile[]>(() =>
    listServerProfiles().filter((p) => p.kind === "cloud"),
  );
  const [active, setActive] = useState<ServerProfile | null>(() => {
    const current = getActiveServerProfile();
    return current?.kind === "cloud" ? current : null;
  });
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    setProfiles(listServerProfiles().filter((p) => p.kind === "cloud"));
    const current = getActiveServerProfile();
    setActive(current?.kind === "cloud" ? current : null);
  }, []);

  const connectCloud = async () => {
    setBusy(true);
    setError(null);
    try {
      const origin = normalizeServerUrl(url);
      const test = await testServerConnection(origin);
      if (!test.ok) {
        setError(test.error);
        return;
      }
      upsertServerProfile({
        name: name.trim() || origin.replace(/^https?:\/\//, ""),
        url: origin,
        kind: "cloud",
      });
      setUrl("");
      setName("");
      reloadForServerSwitch();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const switchTo = (id: string) => {
    activateServerProfile(id);
    reloadForServerSwitch();
  };

  const disconnect = () => {
    clearActiveServerProfile();
    reloadForServerSwitch();
  };

  const connected = desktopUsesCloudProfile() && active !== null;

  return (
    <SettingsPage>
      <SettingsStack>
        <SettingsSection intro="Connect this desktop app to your Kosmos Hosted instance. Your data and login live on the cloud server — the desktop shell is a thin client, like Cursor or Claude desktop.">
          {connected && active ? (
            <SettingsPanel>
              <SettingsPanelHeader>
                <span className="arco-settings-panel__title">Connected</span>
                <Cloud size={16} />
              </SettingsPanelHeader>
              <SettingsPanelBody>
                <SettingsFieldRow label="Instance">
                  <span>{active.url}</span>
                </SettingsFieldRow>
                <SettingsFieldRow label="Profile">
                  <span>{active.name}</span>
                </SettingsFieldRow>
                <Button variant="ghost" onClick={disconnect}>
                  <Unplug size={14} style={{ marginRight: 6 }} />
                  Use local backend
                </Button>
              </SettingsPanelBody>
            </SettingsPanel>
          ) : (
            <SettingsAlert tone="muted">
              Running against the local Arco backend on this machine. Connect to a hosted instance
              below to use your cloud workspace.
            </SettingsAlert>
          )}

          <SettingsPanel>
            <SettingsPanelHeader>
              <span className="arco-settings-panel__title">Saved cloud instances</span>
            </SettingsPanelHeader>
            <SettingsPanelBody>
              {profiles.length === 0 ? (
                <p>No saved cloud instances yet.</p>
              ) : (
                profiles.map((profile) => (
                  <SettingsRow key={profile.id}>
                    <div>
                      <strong>{profile.name}</strong>
                      <SettingsRowMeta>{profile.url}</SettingsRowMeta>
                    </div>
                    <SettingsRowActions>
                      {profile.id === active?.id ? (
                        <span>Active</span>
                      ) : (
                        <Button size="default" onClick={() => switchTo(profile.id)}>
                          Connect
                        </Button>
                      )}
                      <Button
                        size="default"
                        variant="ghost"
                        onClick={() => {
                          removeServerProfile(profile.id);
                          refresh();
                        }}
                        aria-label={`Remove ${profile.name}`}
                      >
                        Remove
                      </Button>
                    </SettingsRowActions>
                  </SettingsRow>
                ))
              )}
            </SettingsPanelBody>
          </SettingsPanel>

          <SettingsSection intro="After checkout, enter the instance URL from your welcome email (e.g. kosmos-yourname.fly.dev).">
            <SettingsStack>
              {error && <SettingsAlert>{error}</SettingsAlert>}
              <SettingsFieldRow label="Instance URL" htmlFor="kosmos-cloud-url">
                <Input
                  id="kosmos-cloud-url"
                  width="auto"
                  value={url}
                  placeholder="kosmos-yourname.fly.dev"
                  onChange={(e) => setUrl(e.target.value)}
                />
              </SettingsFieldRow>
              <SettingsFieldRow label="Label" htmlFor="kosmos-cloud-name" hint="Optional display name">
                <Input
                  id="kosmos-cloud-name"
                  width="auto"
                  value={name}
                  placeholder="My Kosmos"
                  onChange={(e) => setName(e.target.value)}
                />
              </SettingsFieldRow>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button onClick={() => void connectCloud()} disabled={busy || !url.trim()}>
                  <Link2 size={14} style={{ marginRight: 6 }} />
                  {busy ? "Connecting…" : "Connect"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    window.open(deployment.signupUrl, "_blank", "noopener,noreferrer")
                  }
                >
                  Create cloud account
                </Button>
              </div>
            </SettingsStack>
          </SettingsSection>
        </SettingsSection>
      </SettingsStack>
    </SettingsPage>
  );
}
