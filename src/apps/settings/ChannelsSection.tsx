import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Settings → Channels — catalog-driven messaging gateways (OpenClaw-aligned).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, MessageCircle, Plus, RotateCw, Trash2, X } from "lucide-react";
import type { ChannelInfo, ChannelKind, ChannelStatus } from "@shared/types";
import { CHANNEL_CATALOG, channelMeta } from "@shared/channelCatalog";
import type { AgentProfile } from "@shared/agents";
import { BUILTIN_AGENT_ID } from "@shared/agents";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import {
  ModuleFilterSelect,
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

const CHANNEL_KIND_OPTIONS = CHANNEL_CATALOG.map((m) => ({
  value: m.kind,
  label: `${m.label}${m.maturity === "bridge" ? " (bridge)" : m.maturity === "experimental" ? " (exp)" : ""}`,
}));

function defaultNameForKind(kind: ChannelKind): string {
  return channelMeta(kind)?.label ?? kind;
}

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

function supportsMentionToggle(kind: ChannelKind): boolean {
  return kind === "telegram" || kind === "discord" || kind === "slack" || kind === "irc" || kind === "mattermost";
}

export function ChannelsSection() {
  const canManage = useCan("settings:write");
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<ChannelKind>("telegram");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [appToken, setAppToken] = useState("");
  const [optionValues, setOptionValues] = useState<Record<string, string>>({});

  const meta = useMemo(() => channelMeta(kind), [kind]);
  const optionFields = useMemo(
    () => (meta?.fields ?? []).filter((f) => f.key !== "token" && f.key !== "appToken"),
    [meta],
  );
  const tokenField = meta?.fields.find((f) => f.key === "token");
  const appTokenField = meta?.fields.find((f) => f.key === "appToken");

  const refresh = useCallback(async () => {
    try {
      const [chs, agentData] = await Promise.all([api.listChannels(), api.listAgents()]);
      setChannels(chs);
      setAgents(agentData.agents.filter((a) => a.enabled));
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

  const requiredOptionsOk = optionFields
    .filter((f) => f.required)
    .every((f) => Boolean(optionValues[f.key]?.trim()));
  const tokenOk = tokenField?.required === false || kind === "webchat" || Boolean(token.trim());
  const canConnect =
    Boolean(name.trim()) &&
    tokenOk &&
    (!appTokenField?.required || Boolean(appToken.trim())) &&
    requiredOptionsOk;

  const add = async () => {
    if (!canConnect) return;
    try {
      const options: Record<string, string> = {};
      for (const f of optionFields) {
        const v = optionValues[f.key]?.trim();
        if (v) options[f.key] = v;
      }
      await api.addChannel({
        kind,
        name: name.trim(),
        token: token.trim(),
        ...(appToken.trim() ? { appToken: appToken.trim() } : {}),
        ...(Object.keys(options).length ? { options } : {}),
      });
      setName("");
      setToken("");
      setAppToken("");
      setOptionValues({});
      setKind("telegram");
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

  const contentBound = agents.some((a) => a.id === "agent:user:content");
  const hasSlack = channels.some((c) => c.config.kind === "slack");

  return (
    <SettingsPage>
      <SettingsSection intro="Talk to the agent from Telegram, Slack, Discord, and other catalog channels. Unknown senders get a pairing code you approve here. Tool confirms can be answered in-chat with /approve CODE (Slack also gets buttons). Bridge/experimental kinds need external setup.">
        {contentBound && !hasSlack ? (
          <SettingsAlert tone="muted">
            Content Agent is installed. Connect Slack below so it can deliver drafts and ask for
            approval where your team already works. Hosted instances that scale to zero may delay
            weekly automations until the machine wakes.
          </SettingsAlert>
        ) : null}

        {!adding && channels.length === 0 ? (
          <SettingsStack>
            <SettingsRow>
              <span className="arco-settings-panel__title">
                <T k={I18nKey.APPS$SETTINGS_QUICK_START_2_MIN} />
              </span>
            </SettingsRow>
            <div className="arco-settings-account-card__body arco-settings-quickstart">
              <ol className="arco-settings-quickstart__steps">
                <li>
                  <strong>Telegram:</strong> message{" "}
                  <strong>
                    <T k={I18nKey.APPS$SETTINGS_BOTFATHER} />
                  </strong>{" "}
                  →{" "}
                  <code className="arco-code arco-code--xs">
                    <T k={I18nKey.APPS$SETTINGS_NEWBOT} />
                  </code>
                  , paste the bot token below.
                </li>
                <li>
                  <strong>Slack:</strong> create a Slack app, enable <em>Socket Mode</em>, add an
                  app-level token (`connections:write`), install the bot (`xoxb-…`), subscribe to{" "}
                  <code className="arco-code arco-code--xs">message.im</code> and{" "}
                  <code className="arco-code arco-code--xs">app_mention</code>, then paste both
                  tokens below.
                </li>
                <li>Open the bot, send any message, then approve the pairing request here.</li>
                <li>Bind the chat to an agent profile (e.g. Content) under Approved chats.</li>
              </ol>
              <p className="arco-settings-quickstart__tip">
                Tip: set{" "}
                <code className="arco-code arco-code--xs">TELEGRAM_BOT_TOKEN</code> or{" "}
                <code className="arco-code arco-code--xs">SLACK_BOT_TOKEN</code> +{" "}
                <code className="arco-code arco-code--xs">SLACK_APP_TOKEN</code> in{" "}
                <code className="arco-code arco-code--xs">.env</code> to auto-connect on server start.
              </p>
            </div>
          </SettingsStack>
        ) : null}
        <SettingsRow>
          <MessageCircle size={14} className="arco-icon arco-icon--secondary" />
          {canManage && (
            <SettingsRowActions>
              <Button onClick={() => setAdding((v) => !v)}>
                <Plus size={13} /> Add channel
              </Button>
            </SettingsRowActions>
          )}
        </SettingsRow>

        {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}

        {adding && (
          <>
            <SettingsSubhead>Connect a messaging channel</SettingsSubhead>
            <p className="arco-settings-intro">{meta?.setup ?? "Configure credentials below."}</p>
            {meta?.maturity === "bridge" || meta?.maturity === "experimental" ? (
              <SettingsAlert tone="muted">
                Maturity: {meta.maturity}. {meta.description}
              </SettingsAlert>
            ) : null}
            <SettingsStack>
              <SettingsFieldRow label="Platform">
                <ModuleFilterSelect
                  label="Platform"
                  value={kind}
                  options={[...CHANNEL_KIND_OPTIONS]}
                  onChange={(next) => {
                    const k = next as ChannelKind;
                    setKind(k);
                    setOptionValues({});
                    setAppToken("");
                    setToken("");
                    setName(defaultNameForKind(k));
                  }}
                />
              </SettingsFieldRow>
              <SettingsFieldRow label={i18n.t(I18nKey.APPS$SKILLS_NAME)} htmlFor="ch-name">
                <Input
                  id="ch-name"
                  width="auto"
                  value={name}
                  placeholder={defaultNameForKind(kind)}
                  onChange={(e) => setName(e.target.value)}
                />
              </SettingsFieldRow>
              <SettingsFieldRow
                label={tokenField?.label ?? i18n.t(I18nKey.APPS$SETTINGS_BOT_TOKEN)}
                htmlFor="ch-token"
                hint={tokenField?.hint}
              >
                <Input
                  id="ch-token"
                  width="auto"
                  type={tokenField?.secret === false ? "text" : "password"}
                  value={token}
                  placeholder={tokenField?.placeholder ?? i18n.t(I18nKey.APPS$SETTINGS_123456789_AA)}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void add()}
                />
              </SettingsFieldRow>
              {appTokenField ? (
                <SettingsFieldRow
                  label={appTokenField.label}
                  htmlFor="ch-app-token"
                  hint={appTokenField.hint}
                >
                  <Input
                    id="ch-app-token"
                    width="auto"
                    type={appTokenField.secret === false ? "text" : "password"}
                    value={appToken}
                    placeholder={appTokenField.placeholder}
                    onChange={(e) => setAppToken(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void add()}
                  />
                </SettingsFieldRow>
              ) : null}
              {optionFields.map((f) => (
                <SettingsFieldRow key={f.key} label={f.label} htmlFor={`ch-opt-${f.key}`} hint={f.hint}>
                  <Input
                    id={`ch-opt-${f.key}`}
                    width="auto"
                    type={f.secret ? "password" : "text"}
                    value={optionValues[f.key] ?? ""}
                    placeholder={f.placeholder}
                    onChange={(e) =>
                      setOptionValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                    onKeyDown={(ev) => ev.key === "Enter" && void add()}
                  />
                </SettingsFieldRow>
              ))}
              <SettingsFieldRow label=" ">
                <Button variant="primary" disabled={!canConnect} onClick={() => void add()}>
                  <T k={I18nKey.COMMON$CONNECT} />
                </Button>
                <Button onClick={() => setAdding(false)}>
                  <T k={I18nKey.COMMON$CANCEL} />
                </Button>
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

                {ch.status === "running" && supportsMentionToggle(ch.config.kind) ? (
                  <SettingsPanelBody>
                    {ch.config.kind === "telegram" && telegramUrl(ch.botName) ? (
                      <SettingsRow>
                        <span className="arco-settings-tool-row__desc">
                          <T k={I18nKey.APPS$SETTINGS_MESSAGE} />
                          {ch.botName}
                          <T k={I18nKey.APPS$SETTINGS_IN_TELEGRAM_TO_TALK_TO_THE_AGENT} />
                        </span>
                        <SettingsRowActions>
                          <a
                            className="arco-btn"
                            href={telegramUrl(ch.botName)!}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink size={13} />
                            <T k={I18nKey.APPS$SETTINGS_OPEN_IN_TELEGRAM} />
                          </a>
                        </SettingsRowActions>
                      </SettingsRow>
                    ) : null}
                    {ch.config.kind === "slack" ? (
                      <SettingsRow>
                        <span className="arco-settings-tool-row__desc">
                          DM the bot or @mention it in a channel. Approvals appear as Slack buttons
                          (or reply /approve CODE).
                        </span>
                      </SettingsRow>
                    ) : null}
                    {canManage && (
                      <SettingsRow>
                        <span className="arco-settings-tool-row__desc">
                          Require @mention in groups (quiet until addressed)
                        </span>
                        <SettingsRowActions>
                          <Chip
                            active={ch.config.requireMention !== false}
                            onClick={() =>
                              void api
                                .updateChannel(ch.config.id, {
                                  requireMention: !(ch.config.requireMention !== false),
                                })
                                .then(patchRow)
                            }
                            aria-pressed={ch.config.requireMention !== false}
                          >
                            {ch.config.requireMention !== false ? "mention required" : "all group messages"}
                          </Chip>
                        </SettingsRowActions>
                      </SettingsRow>
                    )}
                  </SettingsPanelBody>
                ) : null}

                {ch.pairings.length > 0 && (
                  <SettingsPanelBody>
                    <span className="arco-settings-group-label"><T k={I18nKey.APPS$SETTINGS_PAIRING_REQUESTS} /></span>
                    <p className="arco-settings-intro" style={{ marginTop: 0 }}>
                      First approved chat becomes the channel owner.
                    </p>
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
                    <p className="arco-settings-intro" style={{ marginTop: 0 }}>
                      Bind each chat to an agent profile. Unbound chats use the default (Builtin).
                      Changing the binding starts a fresh transcript for that chat.
                    </p>
                    {ch.peers.map((peer) => (
                      <SettingsRow key={peer.chatId}>
                        <span className="arco-settings-tool-row__desc">
                          {peer.label}
                          {peer.owner ? " · owner" : ""}
                        </span>
                        <code className="arco-code arco-code--xs">{peer.chatId}</code>
                        {canManage && (
                          <SettingsRowActions>
                            <ModuleFilterSelect
                              label={`Agent for ${peer.label}`}
                              value={peer.profileId ?? ""}
                              options={[
                                {
                                  value: "",
                                  label: `Default (${agents.find((a) => a.id === BUILTIN_AGENT_ID)?.name ?? "Arco"})`,
                                },
                                ...agents
                                  .filter((a) => a.id !== BUILTIN_AGENT_ID)
                                  .map((a) => ({ value: a.id, label: a.name })),
                                ...(peer.profileId &&
                                !agents.some((a) => a.id === peer.profileId) &&
                                peer.profileId !== BUILTIN_AGENT_ID
                                  ? [{ value: peer.profileId, label: `${peer.profileId} (unavailable)` }]
                                  : []),
                              ]}
                              onChange={(value) => {
                                void api
                                  .updateChannelPeer(ch.config.id, peer.chatId, {
                                    profileId: value || null,
                                  })
                                  .then(patchRow)
                                  .catch((err) =>
                                    setError(
                                      err instanceof Error ? err.message : "Failed to bind agent",
                                    ),
                                  );
                              }}
                            />
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
