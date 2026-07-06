/**
 * Settings → External access — Arco as an MCP server.
 */
import { useEffect, useState } from "react";
import { Copy, Globe, Trash2 } from "lucide-react";
import type { ExternalAccessInfo, ExternalClientScope } from "@shared/types";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import {
  SettingsAlert,
  SettingsEmpty,
  SettingsFieldRow,
  SettingsPage,
  SettingsRow,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
  SettingsSubhead,
} from "../../components/patterns";
import { Button, Chip, Input } from "../../components/ui";

export function ExternalAccessSection() {
  const canManage = useCan("settings:write");
  const [info, setInfo] = useState<ExternalAccessInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [scope, setScope] = useState<ExternalClientScope>("read");
  const [minted, setMinted] = useState<{ name: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    try {
      setInfo(await api.getExternalAccess());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load external access");
    }
  };

  useEffect(() => {
    if (canManage) void refresh();
  }, [canManage]);

  if (!canManage || !info) return null;

  const toggleMaster = async (enabled: boolean) => {
    setInfo(await api.setExternalAccessEnabled(enabled));
  };

  const mint = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const result = await api.mintExternalClient(trimmed, scope);
    setMinted({ name: trimmed, token: result.token });
    setCopied(false);
    setName("");
    await refresh();
  };

  const copyToken = async () => {
    if (!minted) return;
    await navigator.clipboard.writeText(minted.token);
    setCopied(true);
  };

  const revoke = async (id: string, clientName: string) => {
    if (!window.confirm(`Revoke access for "${clientName}"? Its token stops working immediately.`)) return;
    setInfo(await api.revokeExternalClient(id));
  };

  return (
    <SettingsPage>
      <SettingsSection
        intro={
          <>
            Let external agents (e.g. Claude Desktop) call this system&apos;s capabilities as MCP tools. Endpoint:{" "}
            <code>POST {window.location.origin}/mcp</code> with a bearer token from below.
          </>
        }
      >
        <SettingsStack>
          <SettingsFieldRow label="Server">
            <Globe size={14} className="arco-icon arco-icon--secondary" />
            <Chip active={info.enabled} onClick={() => void toggleMaster(!info.enabled)} aria-pressed={info.enabled}>
              {info.enabled ? "enabled" : "disabled"}
            </Chip>
          </SettingsFieldRow>
        </SettingsStack>

        {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}

        {info.clients.length === 0 ? (
          <SettingsEmpty>No external clients.</SettingsEmpty>
        ) : (
          <SettingsStack>
            {info.clients.map((client) => (
              <SettingsRow key={client.id}>
                <span className="arco-settings-panel__title">{client.name}</span>
                <code className="arco-code arco-code--xs">…{client.tokenPreview}</code>
                <SettingsRowActions>
                  <Chip
                    active={client.scope === "readwrite"}
                    onClick={() =>
                      void api
                        .updateExternalClient(client.id, {
                          scope: client.scope === "read" ? "readwrite" : "read",
                        })
                        .then(setInfo)
                    }
                    title="Read-only tokens never see write tools"
                  >
                    {client.scope}
                  </Chip>
                  <Chip
                    active={client.enabled}
                    onClick={() =>
                      void api.updateExternalClient(client.id, { enabled: !client.enabled }).then(setInfo)
                    }
                    aria-pressed={client.enabled}
                  >
                    {client.enabled ? "active" : "paused"}
                  </Chip>
                  <Button size="icon" onClick={() => void revoke(client.id, client.name)} aria-label={`Revoke ${client.name}`}>
                    <Trash2 size={13} />
                  </Button>
                </SettingsRowActions>
              </SettingsRow>
            ))}
          </SettingsStack>
        )}

        {minted && (
          <div className="arco-settings-callout arco-settings-callout--warning">
            <p className="arco-settings-panel__desc">
              Token for <strong>{minted.name}</strong> — copy it now, it won&apos;t be shown again:
            </p>
            <SettingsRow>
              <code className="arco-settings-callout__token">{minted.token}</code>
              <Button size="icon" onClick={() => void copyToken()} aria-label="Copy token">
                <Copy size={13} />
              </Button>
            </SettingsRow>
            {copied ? <span className="arco-settings-save-bar__saved">Copied</span> : null}
            <Button onClick={() => setMinted(null)}>Done</Button>
          </div>
        )}

        <SettingsSubhead>Mint token</SettingsSubhead>
        <SettingsFieldRow label="Client" htmlFor="ext-client-name">
          <Input
            id="ext-client-name"
            width="auto"
            placeholder="Claude Desktop"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void mint()}
          />
          <select
            className="arco-input arco-input--compact"
            value={scope}
            onChange={(e) => setScope(e.target.value as ExternalClientScope)}
            aria-label="Token scope"
          >
            <option value="read">read</option>
            <option value="readwrite">readwrite</option>
          </select>
          <Button variant="primary" disabled={!name.trim()} onClick={() => void mint()}>
            Mint token
          </Button>
        </SettingsFieldRow>
      </SettingsSection>
    </SettingsPage>
  );
}
