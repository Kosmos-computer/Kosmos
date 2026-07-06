/**
 * Settings → Memory — backends, embedders, and agent grant matrix (Phase 0 stub).
 */
import { MEMORY_WORKSPACE_MOCK } from "../memory/memoryMock";
import { memoryScopeKey } from "@shared/capabilities/memory";
import {
  SettingsAlert,
  SettingsFieldRow,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsSection,
  SettingsStack,
  SettingsSubhead,
} from "../../components/patterns";
import { Chip } from "../../components/ui";

export function MemorySection() {
  const { backends, embedders, grants } = MEMORY_WORKSPACE_MOCK;

  return (
    <SettingsPage>
      <SettingsSection intro="Vector backends, embedding models, and which agents may read or write each memory kind. Server wiring lands in Phase 1–2.">
        <SettingsStack>
          <SettingsAlert tone="muted">
            Memory is in Phase 0 — browse entries in the Memory app. Changes here are preview-only until{" "}
            <code>/api/memory</code> ships.
          </SettingsAlert>

          <SettingsSubhead>Vector backends</SettingsSubhead>
          {backends.map((backend) => (
            <SettingsPanel key={backend.id}>
              <SettingsPanelHeader>
                <span className="arco-settings-panel__title">{backend.label}</span>
                <span className="arco-settings-panel__meta">{backend.kind}</span>
              </SettingsPanelHeader>
              <SettingsPanelBody>
                <p className="arco-settings-panel__desc">{backend.description}</p>
                <SettingsFieldRow label="Status">
                  <Chip active={backend.status === "available"}>{backend.status}</Chip>
                </SettingsFieldRow>
              </SettingsPanelBody>
            </SettingsPanel>
          ))}

          <SettingsSubhead>Embedders</SettingsSubhead>
          {embedders.map((embedder) => (
            <SettingsPanel key={embedder.id}>
              <SettingsPanelHeader>
                <span className="arco-settings-panel__title">{embedder.label}</span>
                <span className="arco-settings-panel__meta">{embedder.dimensions}d</span>
              </SettingsPanelHeader>
              <SettingsPanelBody>
                <SettingsFieldRow label="Status">
                  <Chip active={embedder.status === "available"}>{embedder.status}</Chip>
                </SettingsFieldRow>
              </SettingsPanelBody>
            </SettingsPanel>
          ))}

          <SettingsSubhead>Agent memory grants (preview)</SettingsSubhead>
          <SettingsPanel>
            <SettingsPanelBody>
              <table className="arco-memory-grants-table">
                <thead>
                  <tr>
                    <th>Principal</th>
                    <th>Scope</th>
                    <th>Access</th>
                  </tr>
                </thead>
                <tbody>
                  {grants.map((grant) => (
                    <tr key={`${grant.principalId}-${memoryScopeKey(grant.scope)}`}>
                      <td>{grant.principalId}</td>
                      <td>{memoryScopeKey(grant.scope)}</td>
                      <td>{grant.access}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SettingsPanelBody>
          </SettingsPanel>
        </SettingsStack>
      </SettingsSection>
    </SettingsPage>
  );
}
