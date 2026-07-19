/**
 * Remote agent backend registry — add, switch, and remove connections to a
 * self-hosted OpenHands Agent Server / OpenHands Cloud, or another kosmos
 * server. Shown in Settings → Agent when that runtime is selected. Mirrors
 * the backend-registry pattern from agent-canvas: multiple connections can
 * be registered per kind, one is active at a time.
 */
import { useCallback, useState } from "react";
import { Trash2 } from "lucide-react";
import type {
  AgentBackend,
  AgentBackendConnectionStatus,
  AgentBackendKind,
  OpenhandsBackendVariant,
  Settings,
} from "@shared/types";
import { api } from "../../lib/api";
import {
  SettingsAlert,
  SettingsFieldRow,
  SettingsRow,
  SettingsRowActions,
  SettingsStack,
} from "../../components/patterns";
import { Button, Chip, Input } from "../../components/ui";

interface AgentBackendsFieldsProps {
  kind: AgentBackendKind;
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const KIND_COPY: Record<
  AgentBackendKind,
  { hint: string; keyLabel: string; keyPlaceholder: string; connectedLabel: string }
> = {
  openhands: {
    hint: "A local Agent Server host, or an OpenHands Cloud host.",
    keyLabel: "API key",
    keyPlaceholder: "Session API key",
    connectedLabel: "Connected — OpenHands Agent Server",
  },
  kosmos: {
    hint: "Another kosmos server's host, and a bearer token minted there under Settings → External Access.",
    keyLabel: "Bearer token",
    keyPlaceholder: "Bearer token",
    connectedLabel: "Connected to remote kosmos",
  },
};

export function AgentBackendsFields({ kind, settings, update }: AgentBackendsFieldsProps) {
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [variant, setVariant] = useState<OpenhandsBackendVariant>("local");
  const [status, setStatus] = useState<AgentBackendConnectionStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backends = settings.agentBackends.filter((b) => b.kind === kind);
  const copy = KIND_COPY[kind];

  const testNewConnection = useCallback(async () => {
    setTesting(true);
    setError(null);
    try {
      setStatus(await api.testAgentBackend(kind, host, apiKey));
    } catch (err) {
      setStatus({ connected: false, error: err instanceof Error ? err.message : "Connection failed" });
    } finally {
      setTesting(false);
    }
  }, [kind, host, apiKey]);

  const addBackend = useCallback(async () => {
    setError(null);
    try {
      const result = await api.addAgentBackend({
        name,
        host,
        apiKey,
        kind,
        ...(kind === "openhands" ? { variant } : {}),
      });
      update({
        agentBackends: [...settings.agentBackends, result.backend],
        activeAgentBackendId: result.activeId,
      });
      setName("");
      setHost("");
      setApiKey("");
      setStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add backend");
    }
  }, [name, host, apiKey, kind, variant, settings.agentBackends, update]);

  const activate = useCallback(
    async (id: string) => {
      const result = await api.activateAgentBackend(id);
      update({ activeAgentBackendId: result.activeId });
    },
    [update],
  );

  const remove = useCallback(
    async (id: string) => {
      const result = await api.removeAgentBackend(id);
      update({ agentBackends: result.backends, activeAgentBackendId: result.activeId });
    },
    [update],
  );

  return (
    <SettingsStack className="arco-settings-backend-pane">
      {backends.length === 0 ? (
        <SettingsRow className="arco-settings-backend-pane__note">
          <p className="arco-settings-panel__desc">No backends registered yet — add one below.</p>
        </SettingsRow>
      ) : (
        backends.map((backend: AgentBackend) => {
          const active = settings.activeAgentBackendId === backend.id;
          return (
            <SettingsRow key={backend.id} className="arco-settings-backend-pane__item">
              <div className="arco-settings-panel__identity">
                <span className="arco-settings-panel__title">{backend.name || "Untitled"}</span>
                <span className="arco-settings-panel__meta">
                  {backend.host}
                  {backend.variant ? ` · ${backend.variant}` : ""}
                </span>
              </div>
              <SettingsRowActions>
                <Chip active={active} onClick={() => void activate(backend.id)}>
                  {active ? "Active" : "Use"}
                </Chip>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => void remove(backend.id)}
                  aria-label={`Remove ${backend.name}`}
                >
                  <Trash2 size={14} />
                </Button>
              </SettingsRowActions>
            </SettingsRow>
          );
        })
      )}

      <SettingsRow className="arco-settings-backend-pane__section">
        <span className="arco-settings-group-label">Add backend</span>
      </SettingsRow>

      <SettingsFieldRow label="Name" htmlFor={`set-${kind}-name`} layout="stack">
        <Input
          id={`set-${kind}-name`}
          width="auto"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </SettingsFieldRow>

      <SettingsFieldRow
        label="Host"
        htmlFor={`set-${kind}-host`}
        hint={copy.hint}
        layout="stack"
      >
        <Input
          id={`set-${kind}-host`}
          width="auto"
          placeholder="http://localhost:3000"
          value={host}
          onChange={(e) => setHost(e.target.value)}
        />
      </SettingsFieldRow>

      <SettingsFieldRow
        label={copy.keyLabel}
        htmlFor={`set-${kind}-key`}
        layout="stack"
      >
        <Input
          id={`set-${kind}-key`}
          width="auto"
          type="password"
          placeholder={copy.keyPlaceholder}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </SettingsFieldRow>

      {kind === "openhands" ? (
        <SettingsFieldRow label="Variant" layout="stack">
          <div className="arco-settings-chip-row">
            {(["local", "cloud"] as const).map((v) => (
              <Chip key={v} active={variant === v} onClick={() => setVariant(v)}>
                {v}
              </Chip>
            ))}
          </div>
        </SettingsFieldRow>
      ) : null}

      <SettingsRow className="arco-settings-backend-pane__actions">
        <SettingsRowActions>
          <Button
            variant="default"
            disabled={testing || !host.trim()}
            onClick={() => void testNewConnection()}
          >
            {testing ? "Testing…" : "Test connection"}
          </Button>
          <Button variant="primary" disabled={!host.trim()} onClick={() => void addBackend()}>
            Add backend
          </Button>
        </SettingsRowActions>
      </SettingsRow>

      {status?.connected ? (
        <SettingsRow className="arco-settings-backend-pane__note">
          <SettingsAlert tone="success">
            {copy.connectedLabel}
            {status.version ? ` ${status.version}` : ""}
          </SettingsAlert>
        </SettingsRow>
      ) : null}
      {status && !status.connected && status.error ? (
        <SettingsRow className="arco-settings-backend-pane__note">
          <SettingsAlert tone="error">{status.error}</SettingsAlert>
        </SettingsRow>
      ) : null}
      {error ? (
        <SettingsRow className="arco-settings-backend-pane__note">
          <SettingsAlert tone="error">{error}</SettingsAlert>
        </SettingsRow>
      ) : null}
    </SettingsStack>
  );
}
