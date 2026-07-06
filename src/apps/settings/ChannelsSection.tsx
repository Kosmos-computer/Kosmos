/**
 * Settings → Channels — external messaging gateways (Telegram first).
 */
import { useCallback, useEffect, useState } from "react";
import { Check, MessageCircle, Plus, RotateCw, Trash2, X } from "lucide-react";
import type { ChannelInfo, ChannelStatus } from "@shared/types";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import {
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
  SettingsStatusDot,
  SettingsSubhead,
} from "../../components/patterns";
import { Button, Chip, Input } from "../../components/ui";

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

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(t);
  }, [refresh]);

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
    if (!window.confirm(`Remove channel "${ch.config.name}"? Its approved chats are forgotten.`)) return;
    await api.removeChannel(ch.config.id);
    await refresh();
  };

  return (
    <SettingsPage>
      <SettingsSection intro="Talk to the agent from messaging apps, and let automations deliver results there. Unknown senders get a pairing code — approve them below before their messages are processed.">
        <SettingsRow>
          <MessageCircle size={14} className="arco-icon arco-icon--secondary" />
          {canManage && (
            <SettingsRowActions>
              <Button onClick={() => setAdding((v) => !v)}>
                <Plus size={13} /> Add Telegram
              </Button>
            </SettingsRowActions>
          )}
        </SettingsRow>

        {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}

        {adding && (
          <>
            <SettingsSubhead>Connect Telegram</SettingsSubhead>
            <SettingsStack>
              <SettingsFieldRow label="Name" htmlFor="ch-name">
                <Input id="ch-name" width="auto" value={name} placeholder="Telegram" onChange={(e) => setName(e.target.value)} />
              </SettingsFieldRow>
              <SettingsFieldRow label="Bot token" htmlFor="ch-token" hint="From @BotFather">
                <Input
                  id="ch-token"
                  width="auto"
                  type="password"
                  value={token}
                  placeholder="123456789:AA…"
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void add()}
                />
              </SettingsFieldRow>
              <SettingsFieldRow label=" ">
                <Button variant="primary" disabled={!name.trim() || !token.trim()} onClick={() => void add()}>
                  Connect
                </Button>
                <Button onClick={() => setAdding(false)}>Cancel</Button>
              </SettingsFieldRow>
            </SettingsStack>
          </>
        )}

        {channels.length === 0 && !adding ? (
          <SettingsEmpty>No channels connected.</SettingsEmpty>
        ) : (
          <SettingsStack>
            {channels.map((ch) => (
              <SettingsPanel key={ch.config.id} disabled={!ch.config.enabled}>
                <SettingsPanelHeader>
                  <SettingsStatusDot color={statusColor(ch.status)} label={`status: ${ch.status}`} />
                  <span className="arco-settings-panel__title">{ch.config.name}</span>
                  <span className="arco-settings-panel__meta">
                    {ch.config.kind}
                    {ch.botName ? ` · ${ch.botName}` : ""}
                  </span>
                  {canManage && (
                    <SettingsRowActions>
                      <Chip
                        active={ch.config.enabled}
                        onClick={() =>
                          void api.updateChannel(ch.config.id, { enabled: !ch.config.enabled }).then(patchRow)
                        }
                        aria-pressed={ch.config.enabled}
                      >
                        {ch.config.enabled ? "enabled" : "disabled"}
                      </Chip>
                      <Button
                        size="icon"
                        onClick={() => void api.restartChannel(ch.config.id).then(patchRow)}
                        aria-label={`Restart ${ch.config.name}`}
                        title="Restart"
                      >
                        <RotateCw size={13} />
                      </Button>
                      <Button size="icon" onClick={() => void remove(ch)} aria-label={`Remove ${ch.config.name}`}>
                        <Trash2 size={13} />
                      </Button>
                    </SettingsRowActions>
                  )}
                </SettingsPanelHeader>

                {ch.error ? <SettingsAlert tone="error">{ch.error}</SettingsAlert> : null}

                {ch.pairings.length > 0 && (
                  <SettingsPanelBody>
                    <span className="arco-settings-group-label">Pairing requests</span>
                    {ch.pairings.map((p) => (
                      <SettingsRow key={p.code}>
                        <span className="arco-settings-tool-row__desc">{p.label}</span>
                        <code className="arco-code arco-code--xs">{p.code}</code>
                        {canManage && (
                          <SettingsRowActions>
                            <Button onClick={() => void api.resolvePairing(ch.config.id, p.code, true).then(patchRow)}>
                              <Check size={13} /> Approve
                            </Button>
                            <Button onClick={() => void api.resolvePairing(ch.config.id, p.code, false).then(patchRow)}>
                              <X size={13} /> Deny
                            </Button>
                          </SettingsRowActions>
                        )}
                      </SettingsRow>
                    ))}
                  </SettingsPanelBody>
                )}

                {ch.peers.length > 0 && (
                  <SettingsPanelBody>
                    <span className="arco-settings-group-label">Approved chats</span>
                    {ch.peers.map((peer) => (
                      <SettingsRow key={peer.chatId}>
                        <span className="arco-settings-tool-row__desc">{peer.label}</span>
                        <code className="arco-code arco-code--xs">{peer.chatId}</code>
                        {canManage && (
                          <SettingsRowActions>
                            <Button
                              size="icon"
                              onClick={() => void api.removeChannelPeer(ch.config.id, peer.chatId).then(patchRow)}
                              aria-label={`Remove ${peer.label}`}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </SettingsRowActions>
                        )}
                      </SettingsRow>
                    ))}
                  </SettingsPanelBody>
                )}
              </SettingsPanel>
            ))}
          </SettingsStack>
        )}
      </SettingsSection>
    </SettingsPage>
  );
}
