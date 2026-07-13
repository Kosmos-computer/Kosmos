/**
 * Settings → Connected accounts — GitHub OAuth plus Gmail and team/social links.
 */
import { useCallback, useEffect, useState } from "react";
import { Link2, Trash2 } from "lucide-react";
import type { MailOAuthStatus } from "@shared/mail";
import { presetById } from "@shared/serviceConnections";
import {
  ConnectServiceModal,
  GitHubConnectCard,
  ListSearch,
  SettingsEmpty,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsRow,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
  SettingsSubhead,
} from "../../components/patterns";
import { useGitHubConnection } from "../../connections/useGitHubConnection";
import { useConnectionStore } from "../../connections/useConnectionStore";
import { useCan } from "../../os/auth/authStore";
import { matchesListSearch } from "../../lib/listSearch";
import { api } from "../../lib/api";
import { GmailOAuthSetup } from "../email/GmailOAuthSetup";
import { Button } from "../../components/ui";
import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";

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

  useEffect(() => {
    void api
      .mailStatus()
      .then((status) => setMailOauth(status.oauth))
      .catch(() => setMailOauth(null));
  }, []);

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
          <SettingsSubhead>GitHub</SettingsSubhead>
          <GitHubConnectCard connection={github} variant="inline" />

          <SettingsSubhead><T k={I18nKey.APPS$EMAIL_GMAIL} /></SettingsSubhead>
          <SettingsPanel>
            <SettingsPanelBody>
              <GmailOAuthSetup
                oauth={mailOauth}
                onUpdated={setMailOauth}
                onConnected={() => {
                  void api.mailStatus().then((status) => setMailOauth(status.oauth));
                }}
                variant="settings"
              />
            </SettingsPanelBody>
          </SettingsPanel>

          <SettingsSubhead>Other connected accounts</SettingsSubhead>
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
                <SettingsPanelHeader>
                  <span className="arco-settings-panel__title">{connection.label}</span>
                </SettingsPanelHeader>
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
