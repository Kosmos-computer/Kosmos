import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Settings → Connected accounts — team chat, social networks, and GitHub.
 */
import { useCallback, useEffect, useState } from "react";
import { Github, Link2, Trash2 } from "lucide-react";
import type { GitHubAccountInfo } from "@shared/github";
import { presetById } from "@shared/serviceConnections";
import { ConnectServiceModal, ListSearch } from "../../components/patterns";
import { useConnectionStore } from "../../connections/useConnectionStore";
import { useCan } from "../../os/auth/authStore";
import { matchesListSearch } from "../../lib/listSearch";
import { api } from "../../lib/api";
import {
  SettingsEmpty,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsRow,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
} from "../../components/patterns";
import { Button } from "../../components/ui";

export function ConnectedAccountsSection() {
  const canManage = useCan("settings:write");
  const connections = useConnectionStore((s) => s.connections);
  const addConnection = useConnectionStore((s) => s.addConnection);
  const removeConnection = useConnectionStore((s) => s.removeConnection);

  const [connectOpen, setConnectOpen] = useState(false);
  const [connectDomain, setConnectDomain] = useState<"teams" | "social">("teams");
  const [searchQuery, setSearchQuery] = useState("");
  const [githubStatus, setGithubStatus] = useState<{
    oauthConfigured: boolean;
    accounts: GitHubAccountInfo[];
  } | null>(null);

  const refreshGitHub = useCallback(async () => {
    try {
      setGithubStatus(await api.githubStatus());
    } catch {
      setGithubStatus(null);
    }
  }, []);

  useEffect(() => {
    void refreshGitHub();
  }, [refreshGitHub]);

  const filteredConnections = connections.filter((connection) =>
    matchesListSearch(
      searchQuery,
      connection.label,
      presetById(connection.provider).label,
      connection.instanceUrl,
      connection.domain,
    ),
  );

  const openConnect = useCallback((domain: "teams" | "social") => {
    setConnectDomain(domain);
    setConnectOpen(true);
  }, []);

  return (
    <SettingsPage>
      <SettingsSection intro={i18n.t(I18nKey.APPS$SETTINGS_ACCOUNTS_LINKED_TO_GROUPS_AND_SOCIAL_WORKSPACES_OAUTH_AN)}>
        <SettingsStack>
          <SettingsPanel>
            <SettingsPanelHeader title="GitHub" />
            <SettingsPanelBody>
              {githubStatus?.accounts[0] ? (
                <SettingsRow>
                  <Github size={14} className="arco-icon arco-icon--secondary" />
                  <span>@{githubStatus.accounts[0].login}</span>
                  {canManage ? (
                    <SettingsRowActions>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          void api
                            .disconnectGitHubAccount(githubStatus.accounts[0].id)
                            .then(() => refreshGitHub())
                        }
                      >
                        <Trash2 size={14} />
                        <T k={I18nKey.COMMON$REMOVE} />
                      </Button>
                    </SettingsRowActions>
                  ) : null}
                </SettingsRow>
              ) : githubStatus?.oauthConfigured ? (
                <SettingsRow>
                  <SettingsRowActions>
                    <Button onClick={() => api.connectGitHub()}>
                      <Github size={14} />
                      <T k={I18nKey.APPS$STUDIO_GITHUB_CONNECT} />
                    </Button>
                  </SettingsRowActions>
                </SettingsRow>
              ) : (
                <SettingsEmpty>
                  Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET on the server to enable OAuth.
                </SettingsEmpty>
              )}
            </SettingsPanelBody>
          </SettingsPanel>

          {connections.length > 0 ? (
            <ListSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={i18n.t(I18nKey.APPS$SETTINGS_SEARCH_CONNECTED_ACCOUNTS)}
              ariaLabel="Search connected accounts"
            />
          ) : null}
          {connections.length === 0 ? (
            <SettingsEmpty><T k={I18nKey.APPS$SETTINGS_NO_CONNECTED_ACCOUNTS_YET} /></SettingsEmpty>
          ) : filteredConnections.length === 0 ? (
            <SettingsEmpty><T k={I18nKey.APPS$SETTINGS_NO_ACCOUNTS_MATCH_YOUR_SEARCH} /></SettingsEmpty>
          ) : (
            filteredConnections.map((connection) => (
              <SettingsPanel key={connection.id}>
                <SettingsPanelHeader title={connection.label} />
                <SettingsPanelBody>
                  <SettingsRow>
                    <Link2 size={14} className="arco-icon arco-icon--secondary" />
                    <span>
                      {presetById(connection.provider).label}
                      {connection.instanceUrl ? ` · ${connection.instanceUrl}` : ""}
                    </span>
                    {canManage ? (
                      <SettingsRowActions>
                        <Button variant="ghost" onClick={() => removeConnection(connection.id)}>
                          <Trash2 size={14} /><T k={I18nKey.COMMON$REMOVE} /></Button>
                      </SettingsRowActions>
                    ) : null}
                  </SettingsRow>
                </SettingsPanelBody>
              </SettingsPanel>
            ))
          )}

          {canManage ? (
            <SettingsRow>
              <SettingsRowActions>
                <Button onClick={() => openConnect("teams")}><T k={I18nKey.APPS$SETTINGS_CONNECT_TEAM_CHAT} /></Button>
                <Button onClick={() => openConnect("social")}><T k={I18nKey.APPS$SETTINGS_CONNECT_SOCIAL} /></Button>
              </SettingsRowActions>
            </SettingsRow>
          ) : null}
        </SettingsStack>
      </SettingsSection>

      <ConnectServiceModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        domain={connectDomain}
        existingConnections={connections}
        onConnect={(input) => addConnection(input)}
      />
    </SettingsPage>
  );
}
