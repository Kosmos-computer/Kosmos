import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Settings → External access — Arco as an MCP server.
 */
import { useEffect, useState } from "react";
import { Copy, Globe, Trash2 } from "lucide-react";
import type { ExternalAccessInfo, ExternalClientScope } from "@shared/types";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import {
  ModuleFilterSelect,
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

const SCOPE_OPTIONS = [
  { value: "read", label: "read" },
  { value: "readwrite", label: "readwrite" },
] as const;

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
          <><T k={I18nKey.APPS$SETTINGS_LET_EXTERNAL_AGENTS_E_G_CLAUDE_DESKTOP_CALL_THIS_SYSTEM_} />{" "}
            <code>POST {window.location.origin}<T k={I18nKey.APPS$SETTINGS_MCP} /></code><T k={I18nKey.APPS$SETTINGS_WITH_A_BEARER_TOKEN_FROM_BELOW} /></>
        }
      >
        <SettingsStack>
          <SettingsFieldRow label={i18n.t(I18nKey.APPS$SETTINGS_SERVER)}>
            <Globe size={14} className="arco-icon arco-icon--secondary" />
            <Chip active={info.enabled} onClick={() => void toggleMaster(!info.enabled)} aria-pressed={info.enabled}>
              {info.enabled ? "enabled" : "disabled"}
            </Chip>
          </SettingsFieldRow>
        </SettingsStack>

        {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}

        {info.clients.length === 0 ? (
          <SettingsEmpty><T k={I18nKey.APPS$SETTINGS_NO_EXTERNAL_CLIENTS} /></SettingsEmpty>
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
                    title={i18n.t(I18nKey.APPS$SETTINGS_READ_ONLY_TOKENS_NEVER_SEE_WRITE_TOOLS)}
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
            <p className="arco-settings-panel__desc"><T k={I18nKey.APPS$SETTINGS_TOKEN_FOR} /><strong>{minted.name}</strong><T k={I18nKey.APPS$SETTINGS_COPY_IT_NOW_IT_WON_APOS_T_BE_SHOWN_AGAIN} /></p>
            <SettingsRow>
              <code className="arco-settings-callout__token">{minted.token}</code>
              <Button size="icon" onClick={() => void copyToken()} aria-label={i18n.t(I18nKey.APPS$SETTINGS_COPY_TOKEN)}>
                <Copy size={13} />
              </Button>
            </SettingsRow>
            {copied ? <span className="arco-settings-save-bar__saved"><T k={I18nKey.APPS$SETTINGS_COPIED} /></span> : null}
            <Button onClick={() => setMinted(null)}><T k={I18nKey.COMMON$DONE} /></Button>
          </div>
        )}

        <SettingsSubhead><T k={I18nKey.APPS$SETTINGS_MINT_TOKEN} /></SettingsSubhead>
        <SettingsFieldRow label={i18n.t(I18nKey.APPS$DOWNLOADS_CLIENT)} htmlFor="ext-client-name">
          <Input
            id="ext-client-name"
            width="auto"
            placeholder={i18n.t(I18nKey.APPS$SETTINGS_CLAUDE_DESKTOP)}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void mint()}
          />
          <ModuleFilterSelect
            label={i18n.t(I18nKey.APPS$SETTINGS_TOKEN_SCOPE)}
            value={scope}
            options={SCOPE_OPTIONS}
            onChange={setScope}
          />
          <Button variant="primary" disabled={!name.trim()} onClick={() => void mint()}><T k={I18nKey.APPS$SETTINGS_MINT_TOKEN} /></Button>
        </SettingsFieldRow>
      </SettingsSection>
    </SettingsPage>
  );
}
