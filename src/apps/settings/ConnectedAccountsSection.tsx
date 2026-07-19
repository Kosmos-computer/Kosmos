/**
 * Settings → Connected accounts — GitHub OAuth plus Gmail and team/social links.
 */
import { useCallback, useEffect, useState } from "react";
import { Link2, Trash2 } from "lucide-react";
import type { MailOAuthStatus } from "@shared/mail";
import type { SocialAccountInfo } from "@shared/social";
import { presetById } from "@shared/serviceConnections";
import {
  ConnectServiceModal,
  GitHubConnectCard,
  ListSearch,
  SettingsEmpty,
  SettingsPage,
  SettingsRow,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
} from "../../components/patterns";
import { useGitHubConnection } from "../../connections/useGitHubConnection";
import { useConnectionStore } from "../../connections/useConnectionStore";
import type { ConnectServiceInput } from "../../connections/useConnectionStore";
import { useCan } from "../../os/auth/authStore";
import { matchesListSearch } from "../../lib/listSearch";
import { api } from "../../lib/api";
import { GmailOAuthSetup } from "../email/GmailOAuthSetup";
import { Avatar, Button } from "../../components/ui";
import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { NostrRelaysEditor } from "./NostrRelaysEditor";

function socialProviderLabel(provider: SocialAccountInfo["provider"]): string {
  switch (provider) {
    case "nostr":
      return "Nostr";
    case "mastodon":
      return "Mastodon";
    case "twitter":
      return "X";
    case "facebook":
      return "Facebook";
    case "reddit":
      return "Reddit";
    case "bitsocial":
      return "Bitsocial";
    default:
      return "Bluesky";
  }
}

export function ConnectedAccountsSection() {
  const canManage = useCan("settings:write");
  const github = useGitHubConnection();
  const connections = useConnectionStore((s) => s.connections);
  const addConnection = useConnectionStore((s) => s.addConnection);
  const removeConnection = useConnectionStore((s) => s.removeConnection);

  const [connectOpen, setConnectOpen] = useState(false);
  const [connectDomain, setConnectDomain] = useState<"teams" | "social">("teams");
  const [searchQuery, setSearchQuery] = useState("");
  const [mailOauth, setMailOauth] = useState<MailOAuthStatus | null>(null);
  const [serverAccounts, setServerAccounts] = useState<SocialAccountInfo[]>([]);

  const refreshSocial = useCallback(async () => {
    try {
      const status = await api.socialStatus();
      setServerAccounts(
        status.accounts.filter(
          (account) =>
            account.provider === "bluesky" ||
            account.provider === "mastodon" ||
            account.provider === "nostr" ||
            account.provider === "twitter" ||
            account.provider === "facebook" ||
            account.provider === "reddit" ||
            account.provider === "bitsocial",
        ),
      );
    } catch {
      setServerAccounts([]);
    }
  }, []);

  useEffect(() => {
    void api
      .mailStatus()
      .then((status) => setMailOauth(status.oauth))
      .catch(() => setMailOauth(null));
    void refreshSocial();
  }, [refreshSocial]);

  const filteredConnections = connections.filter((connection) => {
    // Live social providers are listed from the server, not localStorage stubs.
    if (
      connection.provider === "bluesky" ||
      connection.provider === "mastodon" ||
      connection.provider === "nostr" ||
      connection.provider === "twitter" ||
      connection.provider === "facebook" ||
      connection.provider === "reddit" ||
      connection.provider === "bitsocial"
    ) {
      return false;
    }
    return matchesListSearch(
      searchQuery,
      connection.label,
      presetById(connection.provider).label,
      connection.instanceUrl,
      connection.domain,
    );
  });

  const filteredServerAccounts = serverAccounts.filter((account) =>
    matchesListSearch(
      searchQuery,
      account.handle,
      socialProviderLabel(account.provider),
      account.did,
      account.instanceUrl,
      account.pageId,
      account.defaultSubreddit,
      account.rpcUrl,
      ...(account.relays ?? []),
    ),
  );

  const openConnect = useCallback((domain: "teams" | "social") => {
    setConnectDomain(domain);
    setConnectOpen(true);
  }, []);

  const handleConnect = useCallback(
    async (input: ConnectServiceInput) => {
      if (input.provider === "bluesky") {
        const handle = (input.accountHint ?? "").trim();
        const appPassword = (input.token ?? "").trim();
        if (!handle || !appPassword) return;
        await api.connectBluesky({ handle, appPassword });
        await refreshSocial();
        return;
      }
      if (input.provider === "mastodon") {
        const instanceUrl = (input.instanceUrl ?? "").trim();
        const accessToken = (input.token ?? "").trim();
        if (!instanceUrl || !accessToken) return;
        await api.connectMastodon({ instanceUrl, accessToken });
        await refreshSocial();
        return;
      }
      if (input.provider === "nostr") {
        const nsec = (input.token ?? "").trim();
        if (!nsec) return;
        const relays = (input.instanceUrl ?? "")
          .split(/[\s,]+/)
          .map((relay) => relay.trim())
          .filter(Boolean);
        await api.connectNostr({ nsec, relays });
        await refreshSocial();
        return;
      }
      if (input.provider === "twitter") {
        const accessToken = (input.token ?? "").trim();
        if (!accessToken) return;
        await api.connectTwitter({ accessToken });
        await refreshSocial();
        return;
      }
      if (input.provider === "facebook") {
        const accessToken = (input.token ?? "").trim();
        if (!accessToken) return;
        const pageId = (input.accountHint ?? "").trim() || undefined;
        await api.connectFacebook({ accessToken, pageId });
        await refreshSocial();
        return;
      }
      if (input.provider === "reddit") {
        const accessToken = (input.token ?? "").trim();
        if (!accessToken) return;
        const defaultSubreddit = (input.accountHint ?? "").trim() || undefined;
        await api.connectReddit({ accessToken, defaultSubreddit });
        await refreshSocial();
        return;
      }
      if (input.provider === "bitsocial") {
        const rpcUrl = (input.instanceUrl ?? "").trim() || undefined;
        const communities = (input.accountHint ?? "")
          .split(/[\s,]+/)
          .map((part) => part.trim())
          .filter(Boolean);
        await api.connectBitsocial({ rpcUrl, communities });
        await refreshSocial();
        return;
      }
      addConnection(input);
    },
    [addConnection, refreshSocial],
  );

  const hasOtherAccounts = connections.length > 0 || serverAccounts.length > 0;
  const hasFilteredAccounts = filteredConnections.length > 0 || filteredServerAccounts.length > 0;

  return (
    <SettingsPage>
      <SettingsSection intro={i18n.t(I18nKey.APPS$SETTINGS_ACCOUNTS_LINKED_TO_GROUPS_AND_SOCIAL_WORKSPACES_OAUTH_AN)}>
        <SettingsStack>
          <GitHubConnectCard
            connection={github}
            variant="inline"
            className="arco-github-connect--embedded"
          />
        </SettingsStack>

        <SettingsStack>
          <div className="arco-settings-account-card__body">
            <GmailOAuthSetup
              oauth={mailOauth}
              onUpdated={setMailOauth}
              onConnected={() => {
                void api.mailStatus().then((status) => setMailOauth(status.oauth));
              }}
              variant="settings"
            />
          </div>
        </SettingsStack>

        <div className="arco-settings-accounts-group">
          <h2 className="arco-settings-subhead">Other connected accounts</h2>
          {hasOtherAccounts ? (
            <ListSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={i18n.t(I18nKey.APPS$SETTINGS_SEARCH_CONNECTED_ACCOUNTS)}
              ariaLabel="Search connected accounts"
            />
          ) : null}
          {!hasOtherAccounts ? (
            <SettingsEmpty><T k={I18nKey.APPS$SETTINGS_NO_CONNECTED_ACCOUNTS_YET} /></SettingsEmpty>
          ) : !hasFilteredAccounts ? (
            <SettingsEmpty><T k={I18nKey.APPS$SETTINGS_NO_ACCOUNTS_MATCH_YOUR_SEARCH} /></SettingsEmpty>
          ) : (
            <>
              {filteredServerAccounts.map((account) => (
                <SettingsStack key={account.id}>
                  <SettingsRow className="arco-settings-account-card__header">
                    <span className="arco-settings-panel__title arco-settings-panel__title--with-avatar">
                      <Avatar
                        name={account.displayName ?? account.handle}
                        src={account.avatar}
                        size="sm"
                      />
                      {account.provider === "nostr" || account.provider === "bitsocial"
                        ? account.handle
                        : `@${account.handle}`}
                    </span>
                    {canManage ? (
                      <SettingsRowActions>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            void api.disconnectSocialAccount(account.id).then(() => refreshSocial());
                          }}
                        >
                          <Trash2 size={14} /><T k={I18nKey.COMMON$REMOVE} />
                        </Button>
                      </SettingsRowActions>
                    ) : null}
                  </SettingsRow>
                  <SettingsRow>
                    <Link2 size={14} className="arco-icon arco-icon--secondary" />
                    <span className="arco-settings-tool-row__desc">
                      {socialProviderLabel(account.provider)}
                    </span>
                  </SettingsRow>
                  {account.provider === "nostr" ? (
                    <NostrRelaysEditor
                      account={account}
                      canManage={canManage}
                      onUpdated={(updated) => {
                        setServerAccounts((prev) =>
                          prev.map((entry) => (entry.id === updated.id ? updated : entry)),
                        );
                      }}
                    />
                  ) : null}
                </SettingsStack>
              ))}
              {filteredConnections.map((connection) => (
                <SettingsStack key={connection.id}>
                  <SettingsRow className="arco-settings-account-card__header">
                    <span className="arco-settings-panel__title">{connection.label}</span>
                    {canManage ? (
                      <SettingsRowActions>
                        <Button variant="ghost" onClick={() => removeConnection(connection.id)}>
                          <Trash2 size={14} /><T k={I18nKey.COMMON$REMOVE} />
                        </Button>
                      </SettingsRowActions>
                    ) : null}
                  </SettingsRow>
                  <SettingsRow>
                    <Link2 size={14} className="arco-icon arco-icon--secondary" />
                    <span className="arco-settings-tool-row__desc">
                      {presetById(connection.provider).label}
                      {connection.instanceUrl ? ` · ${connection.instanceUrl}` : ""}
                    </span>
                  </SettingsRow>
                </SettingsStack>
              ))}
            </>
          )}

          {canManage ? (
            <SettingsStack>
              <SettingsRow>
                <SettingsRowActions>
                  <Button onClick={() => openConnect("teams")}><T k={I18nKey.APPS$SETTINGS_CONNECT_TEAM_CHAT} /></Button>
                  <Button onClick={() => openConnect("social")}><T k={I18nKey.APPS$SETTINGS_CONNECT_SOCIAL} /></Button>
                </SettingsRowActions>
              </SettingsRow>
            </SettingsStack>
          ) : null}
        </div>
      </SettingsSection>

      <ConnectServiceModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        domain={connectDomain}
        existingConnections={connections}
        onConnect={(input) => {
          void handleConnect(input);
        }}
      />
    </SettingsPage>
  );
}
