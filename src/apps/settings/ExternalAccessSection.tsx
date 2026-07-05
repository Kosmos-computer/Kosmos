/**
 * Settings → External access — Arco as an MCP server. External agents
 * (Claude Desktop, other MCP hosts) can call Arco's capability intents
 * through POST /mcp with a scoped bearer token minted here.
 *
 * Safety posture: master switch defaults off, tokens default to read-only,
 * and a minted token is displayed exactly once — afterwards only its last
 * four characters identify it.
 */
import { useEffect, useState } from "react";
import { Copy, Globe, Trash2 } from "lucide-react";
import type { ExternalAccessInfo, ExternalClientScope } from "@shared/types";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";

export function ExternalAccessSection() {
  const canManage = useCan("settings:write");
  const [info, setInfo] = useState<ExternalAccessInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mint form + one-time token reveal
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
    if (!window.confirm(`Revoke access for "${clientName}"? Its token stops working immediately.`))
      return;
    setInfo(await api.revokeExternalClient(id));
  };

  return (
    <section className="arco-form">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Globe size={14} style={{ color: "var(--arco-text-secondary)" }} />
        <strong>External access (MCP)</strong>
        <span style={{ flex: 1 }} />
        <button
          className={`arco-chip ${info.enabled ? "arco-chip--active" : ""}`}
          onClick={() => void toggleMaster(!info.enabled)}
          aria-pressed={info.enabled}
        >
          {info.enabled ? "enabled" : "disabled"}
        </button>
      </div>
      <span style={{ color: "var(--arco-text-secondary)", fontSize: "var(--arco-text-sm)" }}>
        Let external agents (e.g. Claude Desktop) call this system's capabilities as MCP tools.
        Endpoint: <code>POST {window.location.origin}/mcp</code> with a bearer token from below.
      </span>

      {error && (
        <span style={{ color: "var(--arco-danger, #e5484d)", fontSize: "var(--arco-text-sm)" }}>
          {error}
        </span>
      )}

      {info.clients.length === 0 ? (
        <span style={{ color: "var(--arco-text-tertiary)", fontSize: "var(--arco-text-sm)" }}>
          No external clients.
        </span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {info.clients.map((client) => (
            <div key={client.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: "var(--arco-text-sm)" }}>{client.name}</strong>
              <code style={{ color: "var(--arco-text-tertiary)", fontSize: "var(--arco-text-xs)" }}>
                …{client.tokenPreview}
              </code>
              <span style={{ flex: 1 }} />
              <button
                className={`arco-chip ${client.scope === "readwrite" ? "arco-chip--active" : ""}`}
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
              </button>
              <button
                className={`arco-chip ${client.enabled ? "arco-chip--active" : ""}`}
                onClick={() =>
                  void api
                    .updateExternalClient(client.id, { enabled: !client.enabled })
                    .then(setInfo)
                }
                aria-pressed={client.enabled}
              >
                {client.enabled ? "active" : "paused"}
              </button>
              <button
                className="arco-btn arco-btn--icon"
                onClick={() => void revoke(client.id, client.name)}
                aria-label={`Revoke ${client.name}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {minted && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "8px 10px",
            border: "1px solid var(--arco-warning)",
            borderRadius: "var(--arco-radius-md, 8px)",
          }}
        >
          <span style={{ fontSize: "var(--arco-text-sm)" }}>
            Token for <strong>{minted.name}</strong> — copy it now, it won't be shown again:
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code
              style={{
                flex: 1,
                fontSize: "var(--arco-text-xs)",
                wordBreak: "break-all",
                fontFamily: "var(--arco-font-mono)",
              }}
            >
              {minted.token}
            </code>
            <button className="arco-btn arco-btn--icon" onClick={() => void copyToken()} aria-label="Copy token">
              <Copy size={13} />
            </button>
          </div>
          {copied && (
            <span style={{ color: "var(--arco-success)", fontSize: "var(--arco-text-xs)" }}>Copied</span>
          )}
          <div>
            <button className="arco-btn" onClick={() => setMinted(null)}>
              Done
            </button>
          </div>
        </div>
      )}

      <label className="arco-label" htmlFor="ext-client-name">
        New client token
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="ext-client-name"
          className="arco-input"
          style={{ flex: 1 }}
          placeholder="Client name (e.g. Claude Desktop)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void mint()}
        />
        <select
          className="arco-input"
          style={{ width: 120 }}
          value={scope}
          onChange={(e) => setScope(e.target.value as ExternalClientScope)}
          aria-label="Token scope"
        >
          <option value="read">read</option>
          <option value="readwrite">readwrite</option>
        </select>
        <button className="arco-btn arco-btn--primary" disabled={!name.trim()} onClick={() => void mint()}>
          Mint token
        </button>
      </div>
    </section>
  );
}
