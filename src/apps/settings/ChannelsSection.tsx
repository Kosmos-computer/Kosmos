import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Settings → Channels — external messaging gateways (Telegram first).
 */
import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, MessageCircle, Plus, RotateCw, Trash2, X } from "lucide-react";
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

function telegramUrl(botName: string | undefined): string | null {
  if (!botName?.startsWith("@")) return null;
  return `https://t.me/${botName.slice(1)}`;
}

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
      <SettingsSection intro={i18n.t(I18nKey.APPS$SETTINGS_TALK_TO_THE_AGENT_FROM_TELEGRAM_ON_YOUR_PHONE_UNKNOWN_SE)}>
        {!adding && channels.length === 0 ? (
          <SettingsPanel>
            <SettingsPanelBody>
              <span className="arco-settings-group-label"><T k={I18nKey.APPS$SETTINGS_QUICK_START_2_MIN} /></span>
              <ol className="arco-settings-intro" style={{ margin: 0, paddingLeft: "1.25rem" }}>
                <li><T k={I18nKey.APPS$SETTINGS_IN_TELEGRAM_MESSAGE} /><strong><T k={I18nKey.APPS$SETTINGS_BOTFATHER} /></strong><T k={I18nKey.APPS$SETTINGS_AND_SEND} /><code className="arco-code arco-code--xs"><T k={I18nKey.APPS$SETTINGS_NEWBOT} /></code>
                </li>
                <li><T k={I18nKey.APPS$SETTINGS_COPY_THE_BOT_TOKEN_BOTFATHER_REPLIES_WITH} /></li>
                <li><T k={I18nKey.APPS$SETTINGS_CLICK} /><strong><T k={I18nKey.APPS$SETTINGS_ADD_TELEGRAM} /></strong><T k={I18nKey.APPS$SETTINGS_BELOW_AND_PASTE_THE_TOKEN} /></li>
                <li><T k={I18nKey.APPS$SETTINGS_OPEN_YOUR_NEW_BOT_IN_TELEGRAM_SEND_ANY_MESSAGE_THEN_APPR} /></li>
              </ol>
              <p className="arco-settings-intro"><T k={I18nKey.APPS$SETTINGS_TIP_SET} /><code className="arco-code arco-code--xs">TELEGRAM_BOT_TOKEN</code><T k={I18nKey.APPS$SETTINGS_IN} />{" "}
                <code className="arco-code arco-code--xs"><T k={I18nKey.APPS$SETTINGS_ENV} /></code><T k={I18nKey.APPS$SETTINGS_TO_AUTO_CONNECT_ON_SERVER_START} /></p>
            </SettingsPanelBody>
          </SettingsPanel>
        ) : null}
        <SettingsRow>
          <MessageCircle size={14} className="arco-icon arco-icon--secondary" />
          {canManage && (
            <SettingsRowActions>
              <Button onClick={() => setAdding((v) => !v)}>
                <Plus size={13} /><T k={I18nKey.APPS$SETTINGS_ADD_TELEGRAM} /></Button>
            </SettingsRowActions>
          )}
        </SettingsRow>

        {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}

        {adding && (
          <>
            <SettingsSubhead><T k={I18nKey.APPS$SETTINGS_CONNECT_TELEGRAM} /></SettingsSubhead>
            <p className="arco-settings-intro"><T k={I18nKey.APPS$SETTINGS_NEED_A_TOKEN_MESSAGE} /><strong><T k={I18nKey.APPS$SETTINGS_BOTFATHER} /></strong> → <code className="arco-code arco-code--xs"><T k={I18nKey.APPS$SETTINGS_NEWBOT} /></code><T k={I18nKey.APPS$SETTINGS_FOLLOW_THE_PROMPTS_PASTE_THE_TOKEN_BELOW} /></p>
            <SettingsStack>
              <SettingsFieldRow label={i18n.t(I18nKey.APPS$SKILLS_NAME)} htmlFor="ch-name">
                <Input id="ch-name" width="auto" value={name} placeholder={i18n.t(I18nKey.APPS$SETTINGS_TELEGRAM)} onChange={(e) => setName(e.target.value)} />
              </SettingsFieldRow>
              <SettingsFieldRow label={i18n.t(I18nKey.APPS$SETTINGS_BOT_TOKEN)} htmlFor="ch-token" hint="From @BotFather">
                <Input
                  id="ch-token"
                  width="auto"
                  type="password"
                  value={token}
                  placeholder={i18n.t(I18nKey.APPS$SETTINGS_123456789_AA)}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void add()}
                />
              </SettingsFieldRow>
              <SettingsFieldRow label=" ">
                <Button variant="primary" disabled={!name.trim() || !token.trim()} onClick={() => void add()}><T k={I18nKey.COMMON$CONNECT} /></Button>
                <Button onClick={() => setAdding(false)}><T k={I18nKey.COMMON$CANCEL} /></Button>
              </SettingsFieldRow>
            </SettingsStack>
          </>
        )}

        {channels.length === 0 && !adding ? (
          <SettingsEmpty><T k={I18nKey.APPS$SETTINGS_NO_CHANNELS_CONNECTED} /></SettingsEmpty>
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
                        title={i18n.t(I18nKey.APPS$SETTINGS_RESTART)}
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

                {ch.status === "running" && telegramUrl(ch.botName) ? (
                  <SettingsPanelBody>
                    <SettingsRow>
                      <span className="arco-settings-tool-row__desc"><T k={I18nKey.APPS$SETTINGS_MESSAGE} />{ch.botName}<T k={I18nKey.APPS$SETTINGS_IN_TELEGRAM_TO_TALK_TO_THE_AGENT} /></span>
                      <SettingsRowActions>
                        <a
                          className="arco-btn"
                          href={telegramUrl(ch.botName)!}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={13} /><T k={I18nKey.APPS$SETTINGS_OPEN_IN_TELEGRAM} /></a>
                      </SettingsRowActions>
                    </SettingsRow>
                  </SettingsPanelBody>
                ) : null}

                {ch.pairings.length > 0 && (
                  <SettingsPanelBody>
                    <span className="arco-settings-group-label"><T k={I18nKey.APPS$SETTINGS_PAIRING_REQUESTS} /></span>
                    {ch.pairings.map((p) => (
                      <SettingsRow key={p.code}>
                        <span className="arco-settings-tool-row__desc">{p.label}</span>
                        <code className="arco-code arco-code--xs">{p.code}</code>
                        {canManage && (
                          <SettingsRowActions>
                            <Button onClick={() => void api.resolvePairing(ch.config.id, p.code, true).then(patchRow)}>
                              <Check size={13} /><T k={I18nKey.APPS$SETTINGS_APPROVE} /></Button>
                            <Button onClick={() => void api.resolvePairing(ch.config.id, p.code, false).then(patchRow)}>
                              <X size={13} /><T k={I18nKey.APPS$SETTINGS_DENY} /></Button>
                          </SettingsRowActions>
                        )}
                      </SettingsRow>
                    ))}
                  </SettingsPanelBody>
                )}

                {ch.peers.length > 0 && (
                  <SettingsPanelBody>
                    <span className="arco-settings-group-label"><T k={I18nKey.APPS$SETTINGS_APPROVED_CHATS} /></span>
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
