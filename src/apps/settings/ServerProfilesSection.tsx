/**
 * Settings → Server — manage saved Arco backend profiles (mobile bundled shell).
 */
import { useCallback, useState } from "react";
import { Loader2, Plus, Radar, Trash2 } from "lucide-react";
import {
  SettingsFieldRow,
  SettingsPage,
  SettingsRow,
  SettingsRowActions,
  SettingsRowMeta,
  SettingsSection,
  SettingsStack,
} from "../../components/patterns";
import { Button, Input } from "../../components/ui";
import type { ServerProfile } from "../../os/server/serverProfileTypes";
import {
  activateServerProfile,
  discoverNearbyServers,
  getActiveServerProfile,
  listServerProfiles,
  normalizeServerUrl,
  reloadForServerSwitch,
  removeServerProfile,
  testServerConnection,
  upsertServerProfile,
} from "../../os/server/serverProfileStore";

export function ServerProfilesSection() {
  const [profiles, setProfiles] = useState<ServerProfile[]>(() => listServerProfiles());
  const [activeId, setActiveId] = useState<string | null>(() => getActiveServerProfile()?.id ?? null);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [discovered, setDiscovered] = useState<{ url: string; label: string }[]>([]);

  const refresh = useCallback(() => {
    setProfiles(listServerProfiles());
    setActiveId(getActiveServerProfile()?.id ?? null);
  }, []);

  const addProfile = async () => {
    setBusy(true);
    setError(null);
    try {
      const origin = normalizeServerUrl(url);
      const test = await testServerConnection(origin);
      if (!test.ok) {
        setError(test.error);
        return;
      }
      upsertServerProfile({ name: name.trim() || origin, url: origin });
      setUrl("");
      setName("");
      refresh();
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

  const scan = async () => {
    setScanning(true);
    setError(null);
    setDiscovered([]);
    try {
      const hits = await discoverNearbyServers();
      setDiscovered(hits.map((h) => ({ url: h.url, label: h.label })));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  };

  return (
    <SettingsPage>
      <SettingsStack>
        <SettingsSection
          intro="Switch between cloud, home (Tailscale/LAN), or Chromebook Linux backends. Each has separate login and data."
        >
          {profiles.length === 0 ? (
            <p>No saved servers. Add one below or use Find on network.</p>
          ) : (
            profiles.map((profile) => (
              <SettingsRow key={profile.id}>
                <div>
                  <strong>{profile.name}</strong>
                  <SettingsRowMeta>{profile.url}</SettingsRowMeta>
                </div>
                <SettingsRowActions>
                  {profile.id === activeId ? (
                    <span>Active</span>
                  ) : (
                    <Button size="default" variant="default" onClick={() => switchTo(profile.id)}>
                      Switch
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
                    <Trash2 size={14} />
                  </Button>
                </SettingsRowActions>
              </SettingsRow>
            ))
          )}
        </SettingsSection>

        <SettingsSection intro="Add a server by URL. No default is provided — enter your Coolify domain, Tailscale host, or LAN address.">
          <SettingsFieldRow label="URL">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-server.example or http://10.0.0.12:4600"
              autoCapitalize="none"
              spellCheck={false}
            />
          </SettingsFieldRow>
          <SettingsFieldRow label="Label">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional name" />
          </SettingsFieldRow>
          {error && <p style={{ color: "var(--arco-danger)" }}>{error}</p>}
          <SettingsRowActions>
            <Button onClick={() => void addProfile()} disabled={busy || !url.trim()}>
              {busy ? <Loader2 size={14} className="arco-spin" /> : <Plus size={14} />}
              Add
            </Button>
            <Button variant="default" onClick={() => void scan()} disabled={scanning}>
              {scanning ? <Loader2 size={14} className="arco-spin" /> : <Radar size={14} />}
              Find on network
            </Button>
          </SettingsRowActions>
          {discovered.length > 0 && (
            <ul className="arco-server-connect__list">
              {discovered.map((hit) => (
                <li key={hit.url}>
                  <button
                    type="button"
                    className="arco-server-connect__hit"
                    onClick={() => {
                      setUrl(hit.url);
                      setName(hit.label);
                    }}
                  >
                    <strong>{hit.label}</strong>
                    <span>{hit.url}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SettingsSection>
      </SettingsStack>
    </SettingsPage>
  );
}
