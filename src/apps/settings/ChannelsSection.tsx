/**
 * Settings → Channels — external messaging gateways (Telegram first).
 *
 * One card per channel: status dot, bot identity, enable toggle, restart,
 * delete, approved chats, and pending pairing requests. Pairing approval
 * lives here on purpose: unknown senders can never talk their way in from
 * the channel itself — the decision happens in this authenticated surface.
 */
import { useCallback, useEffect, useState } from "react";
import { Check, MessageCircle, Plus, RotateCw, Trash2, X } from "lucide-react";
import type { ChannelInfo, ChannelStatus } from "@shared/types";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";

/** Status → dot color, matching the MCP section's visual language. */
function statusColor(status: ChannelStatus): string {
  switch (status) {
    case "running":
      return "var(--arco-success)";
    case "connecting":
      return "var(--arco-warning)";
    case "error":
      return "var(--arco-danger, #e5484d)";
    default:
      return "var(--arco-text-tertiary)";
  }
}

export function ChannelsSection() {
  const canManage = useCan("settings:write");
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add form (Telegram only in v1 — the kind picker appears with adapter #2)
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [token, setToken] = useState("");

  const refresh = useCallback(async () => {
    try {
      setChannels(await api.listChannels());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load channels");
    }
  }, []);

  // Poll while visible: pairing requests arrive from outside the app, so the
  // list must update without a user action.
  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  /** Replace one channel's row with the server's post-mutation snapshot. */
  const patchRow = (updated: ChannelInfo | undefined) => {
    if (!updated) return void refresh();
    setChannels((list) => list.map((ch) => (ch.config.id === updated.config.id ? updated : ch)));
  };

  const add = async () => {
    if (!name.trim() || !token.trim()) return;
    try {
      await api.addChannel({ kind: "telegram", name: name.trim(), token: token.trim() });
      setName("");
      setToken("");
      setAdding(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add channel");
    }
  };

  const remove = async (ch: ChannelInfo) => {
    if (!window.confirm(`Remove channel "${ch.config.name}"? Its approved chats are forgotten.`))
      return;
    await api.removeChannel(ch.config.id);
    await refresh();
  };

  return (
    <section className="arco-form">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <MessageCircle size={14} style={{ color: "var(--arco-text-secondary)" }} />
        <strong>Channels</strong>
        <span style={{ flex: 1 }} />
        {canManage && (
          <button className="arco-btn" onClick={() => setAdding((v) => !v)}>
            <Plus size={13} /> Add Telegram
          </button>
        )}
      </div>
      <span style={{ color: "var(--arco-text-secondary)", fontSize: "var(--arco-text-sm)" }}>
        Talk to the agent from messaging apps, and let automations deliver results there. Unknown
        senders get a pairing code — approve them below before their messages are processed.
      </span>

      {error && (
        <span style={{ color: "var(--arco-danger, #e5484d)", fontSize: "var(--arco-text-sm)" }}>
          {error}
        </span>
      )}

      {adding && (
        <div className="arco-form" style={{ paddingLeft: 8 }}>
          <label className="arco-label" htmlFor="ch-name">
            Name
          </label>
          <input
            id="ch-name"
            className="arco-input"
            value={name}
            placeholder="Telegram"
            onChange={(e) => setName(e.target.value)}
          />
          <label className="arco-label" htmlFor="ch-token">
            Bot token (from @BotFather)
          </label>
          <input
            id="ch-token"
            className="arco-input"
            type="password"
            value={token}
            placeholder="123456789:AA…"
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void add()}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="arco-btn arco-btn--primary"
              disabled={!name.trim() || !token.trim()}
              onClick={() => void add()}
            >
              Connect
            </button>
            <button className="arco-btn" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {channels.length === 0 && !adding ? (
        <span style={{ color: "var(--arco-text-tertiary)", fontSize: "var(--arco-text-sm)" }}>
          No channels connected.
        </span>
      ) : (
        channels.map((ch) => (
          <div key={ch.config.id} className="arco-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: statusColor(ch.status),
                  flexShrink: 0,
                }}
              />
              <strong style={{ fontSize: "var(--arco-text-sm)" }}>{ch.config.name}</strong>
              <span style={{ color: "var(--arco-text-tertiary)", fontSize: "var(--arco-text-xs)" }}>
                {ch.config.kind}
                {ch.botName ? ` · ${ch.botName}` : ""}
              </span>
              <span style={{ flex: 1 }} />
              {canManage && (
                <>
                  <button
                    className={`arco-chip ${ch.config.enabled ? "arco-chip--active" : ""}`}
                    onClick={() =>
                      void api
                        .updateChannel(ch.config.id, { enabled: !ch.config.enabled })
                        .then(patchRow)
                    }
                    aria-pressed={ch.config.enabled}
                  >
                    {ch.config.enabled ? "enabled" : "disabled"}
                  </button>
                  <button
                    className="arco-btn arco-btn--icon"
                    onClick={() => void api.restartChannel(ch.config.id).then(patchRow)}
                    aria-label={`Restart ${ch.config.name}`}
                    title="Restart"
                  >
                    <RotateCw size={13} />
                  </button>
                  <button
                    className="arco-btn arco-btn--icon"
                    onClick={() => void remove(ch)}
                    aria-label={`Remove ${ch.config.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>

            {ch.error && (
              <div
                style={{
                  color: "var(--arco-danger, #e5484d)",
                  fontSize: "var(--arco-text-xs)",
                  marginTop: 4,
                }}
              >
                {ch.error}
              </div>
            )}

            {ch.pairings.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                <span className="arco-label">Pairing requests</span>
                {ch.pairings.map((p) => (
                  <div key={p.code} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "var(--arco-text-sm)" }}>{p.label}</span>
                    <code style={{ fontSize: "var(--arco-text-xs)", color: "var(--arco-text-tertiary)" }}>
                      {p.code}
                    </code>
                    <span style={{ flex: 1 }} />
                    {canManage && (
                      <>
                        <button
                          className="arco-btn"
                          onClick={() =>
                            void api.resolvePairing(ch.config.id, p.code, true).then(patchRow)
                          }
                        >
                          <Check size={13} /> Approve
                        </button>
                        <button
                          className="arco-btn"
                          onClick={() =>
                            void api.resolvePairing(ch.config.id, p.code, false).then(patchRow)
                          }
                        >
                          <X size={13} /> Deny
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {ch.peers.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                <span className="arco-label">Approved chats</span>
                {ch.peers.map((peer) => (
                  <div key={peer.chatId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "var(--arco-text-sm)" }}>{peer.label}</span>
                    <code style={{ fontSize: "var(--arco-text-xs)", color: "var(--arco-text-tertiary)" }}>
                      {peer.chatId}
                    </code>
                    <span style={{ flex: 1 }} />
                    {canManage && (
                      <button
                        className="arco-btn arco-btn--icon"
                        onClick={() =>
                          void api.removeChannelPeer(ch.config.id, peer.chatId).then(patchRow)
                        }
                        aria-label={`Remove ${peer.label}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </section>
  );
}
