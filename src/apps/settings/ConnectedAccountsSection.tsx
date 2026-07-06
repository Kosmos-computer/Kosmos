/**
 * Settings → Connected accounts — team chat and social network links.
 */
import { useCallback, useState } from "react";
import { Link2, Trash2 } from "lucide-react";
import { presetById } from "@shared/serviceConnections";
import { ConnectServiceModal } from "../../components/patterns/ConnectServiceModal";
import { useConnectionStore } from "../../connections/useConnectionStore";
import { useCan } from "../../os/auth/authStore";
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

  const openConnect = useCallback((domain: "teams" | "social") => {
    setConnectDomain(domain);
    setConnectOpen(true);
  }, []);

  return (
    <SettingsPage>
      <SettingsSection intro="Accounts linked to Groups and Social workspaces. OAuth and server-side token storage replace local stubs in a later phase.">
        <SettingsStack>
          {connections.length === 0 ? (
            <SettingsEmpty>No connected accounts yet.</SettingsEmpty>
          ) : (
            connections.map((connection) => (
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
                          <Trash2 size={14} /> Remove
                        </Button>
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
                <Button onClick={() => openConnect("teams")}>Connect team chat</Button>
                <Button onClick={() => openConnect("social")}>Connect social</Button>
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
