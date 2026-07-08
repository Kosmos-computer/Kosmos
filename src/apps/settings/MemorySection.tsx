import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const { backends, embedders, grants } = MEMORY_WORKSPACE_MOCK;

  return (
    <SettingsPage>
      <SettingsSection intro={i18n.t(I18nKey.APPS$SETTINGS_VECTOR_BACKENDS_EMBEDDING_MODELS_AND_WHICH_AGENTS_MAY_RE)}>
        <SettingsStack>
          <SettingsAlert tone="muted"><T k={I18nKey.APPS$SETTINGS_MEMORY_IS_IN_PHASE_0_BROWSE_ENTRIES_IN_THE_MEMORY_APP_CH} />{" "}
            <code><T k={I18nKey.APPS$SETTINGS_API_MEMORY} /></code><T k={I18nKey.APPS$SETTINGS_SHIPS} /></SettingsAlert>

          <SettingsSubhead><T k={I18nKey.APPS$SETTINGS_VECTOR_BACKENDS} /></SettingsSubhead>
          {backends.map((backend) => (
            <SettingsPanel key={backend.id}>
              <SettingsPanelHeader>
                <span className="arco-settings-panel__title">{backend.label}</span>
                <span className="arco-settings-panel__meta">{backend.kind}</span>
              </SettingsPanelHeader>
              <SettingsPanelBody>
                <p className="arco-settings-panel__desc">{backend.description}</p>
                <SettingsFieldRow label={i18n.t(I18nKey.APPS$LONGFORMER_STATUS)}>
                  <Chip active={backend.status === "available"}>{backend.status}</Chip>
                </SettingsFieldRow>
              </SettingsPanelBody>
            </SettingsPanel>
          ))}

          <SettingsSubhead><T k={I18nKey.APPS$SETTINGS_EMBEDDERS} /></SettingsSubhead>
          {embedders.map((embedder) => (
            <SettingsPanel key={embedder.id}>
              <SettingsPanelHeader>
                <span className="arco-settings-panel__title">{embedder.label}</span>
                <span className="arco-settings-panel__meta">{embedder.dimensions}<T k={I18nKey.APPS$SETTINGS_D} /></span>
              </SettingsPanelHeader>
              <SettingsPanelBody>
                <SettingsFieldRow label={i18n.t(I18nKey.APPS$LONGFORMER_STATUS)}>
                  <Chip active={embedder.status === "available"}>{embedder.status}</Chip>
                </SettingsFieldRow>
              </SettingsPanelBody>
            </SettingsPanel>
          ))}

          <SettingsSubhead><T k={I18nKey.APPS$SETTINGS_AGENT_MEMORY_GRANTS_PREVIEW} /></SettingsSubhead>
          <SettingsPanel>
            <SettingsPanelBody>
              <table className="arco-memory-grants-table">
                <thead>
                  <tr>
                    <th><T k={I18nKey.APPS$SETTINGS_PRINCIPAL} /></th>
                    <th><T k={I18nKey.APPS$SETTINGS_SCOPE} /></th>
                    <th><T k={I18nKey.APPS$SETTINGS_ACCESS} /></th>
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
