/**
 * OpenHands backend registry — add, switch, and remove connections to a
 * self-hosted OpenHands Agent Server or OpenHands Cloud. Shown in
 * Settings → Agent when the OpenHands runtime is selected. Mirrors the
 * backend-registry pattern from agent-canvas: multiple connections can be
 * registered, one is active at a time.
 */
import { useCallback, useState } from "react";
import type { OpenhandsBackend, OpenhandsBackendKind, OpenhandsConnectionStatus, Settings } from "@shared/types";
import { api } from "../../lib/api";
import { SettingsAlert, SettingsFieldRow, SettingsRow, SettingsRowActions, SettingsStack } from "../../components/patterns";
import { Button, Chip, Input } from "../../components/ui";

interface OpenhandsBackendFieldsProps {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

export function OpenhandsBackendFields({ settings, update }: OpenhandsBackendFieldsProps) {
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [kind, setKind] = useState<OpenhandsBackendKind>("local");
  const [status, setStatus] = useState<OpenhandsConnectionStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backends = settings.openhandsBackends;

  const testNewConnection = useCallback(async () => {
    setTesting(true);
    setError(null);
    try {
      setStatus(await api.testOpenhandsConnection(host, apiKey));
    } catch (err) {
      setStatus({ connected: false, error: err instanceof Error ? err.message : "Connection failed" });
    } finally {
      setTesting(false);
    }
  }, [host, apiKey]);

  const addBackend = useCallback(async () => {
    setError(null);
    try {
      const result = await api.addOpenhandsBackend({ name, host, apiKey, kind });
      update({
        openhandsBackends: [...backends, result.backend],
        openhandsActiveBackendId: result.activeId,
      });
      setName("");
      setHost("");
      setApiKey("");
      setStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add backend");
    }
  }, [name, host, apiKey, kind, backends, update]);

  const activate = useCallback(
    async (id: string) => {
      const result = await api.activateOpenhandsBackend(id);
      update({ openhandsActiveBackendId: result.activeId });
    },
    [update],
  );

  const remove = useCallback(
    async (id: string) => {
      const result = await api.removeOpenhandsBackend(id);
      update({ openhandsBackends: result.backends, openhandsActiveBackendId: result.activeId });
    },
    [update],
  );

  return (
    <SettingsStack>
      {backends.length === 0 ? (
        <SettingsAlert tone="muted">No OpenHands backends registered yet — add one below.</SettingsAlert>
      ) : (
        <SettingsStack>
          {backends.map((backend: OpenhandsBackend) => (
            <SettingsRow key={backend.id}>
              <Chip
                active={settings.openhandsActiveBackendId === backend.id}
                onClick={() => void activate(backend.id)}
              >
                {backend.name}
              </Chip>
              <span className="arco-settings-panel__meta">
                {backend.host} · {backend.kind}
              </span>
              <SettingsRowActions>
                <Button size="icon" onClick={() => void remove(backend.id)} aria-label={`Remove ${backend.name}`}>
                  ×
                </Button>
              </SettingsRowActions>
            </SettingsRow>
          ))}
        </SettingsStack>
      )}

      <SettingsFieldRow label="Add backend" htmlFor="set-openhands-host" hint="A local Agent Server host, or an OpenHands Cloud host.">
        <Input
          id="set-openhands-name"
          width="auto"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          id="set-openhands-host"
          width="auto"
          placeholder="http://localhost:3000"
          value={host}
          onChange={(e) => setHost(e.target.value)}
        />
        <Input
          id="set-openhands-key"
          width="auto"
          type="password"
          placeholder="Session API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <div className="arco-settings-chip-row">
          {(["local", "cloud"] as const).map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {k}
            </Chip>
          ))}
        </div>
        <Button variant="default" disabled={testing || !host.trim()} onClick={() => void testNewConnection()}>
          {testing ? "Testing…" : "Test connection"}
        </Button>
        <Button variant="primary" disabled={!host.trim()} onClick={() => void addBackend()}>
          Add backend
        </Button>
      </SettingsFieldRow>

      {status?.connected ? (
        <SettingsAlert tone="success">Connected — OpenHands Agent Server {status.version}</SettingsAlert>
      ) : null}
      {status && !status.connected && status.error ? <SettingsAlert tone="error">{status.error}</SettingsAlert> : null}
      {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}
    </SettingsStack>
  );
}
