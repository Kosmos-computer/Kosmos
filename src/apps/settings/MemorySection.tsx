import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Settings → Memory — backends, embedders, and agent grant matrix (Phase 0 stub).
 */
import { MEMORY_WORKSPACE_MOCK } from "../memory/memoryMock";
import { memoryScopeKey } from "@shared/capabilities/memory";
import {
  SettingsAlert,
  SettingsPage,
  SettingsRow,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
  SettingsSubhead,
} from "../../components/patterns";
import { Chip } from "../../components/ui";

export function MemorySection() {
  const { backends, embedders, grants } = MEMORY_WORKSPACE_MOCK;

  return (
    <SettingsPage>
      <SettingsSection intro={i18n.t(I18nKey.APPS$SETTINGS_VECTOR_BACKENDS_EMBEDDING_MODELS_AND_WHICH_AGENTS_MAY_RE)}>
        <SettingsAlert tone="muted">
          <T k={I18nKey.APPS$SETTINGS_MEMORY_IS_IN_PHASE_0_BROWSE_ENTRIES_IN_THE_MEMORY_APP_CH} />{" "}
          <code><T k={I18nKey.APPS$SETTINGS_API_MEMORY} /></code>
          <T k={I18nKey.APPS$SETTINGS_SHIPS} />
        </SettingsAlert>

        <div className="arco-settings-memory-group">
          <SettingsSubhead><T k={I18nKey.APPS$SETTINGS_VECTOR_BACKENDS} /></SettingsSubhead>
          {backends.map((backend) => (
            <SettingsStack key={backend.id}>
              <SettingsRow className="arco-settings-memory-card__header">
                <div className="arco-settings-panel__identity">
                  <span className="arco-settings-panel__title">{backend.label}</span>
                  <span className="arco-settings-panel__meta">{backend.kind}</span>
                </div>
                <SettingsRowActions>
                  <Chip active={backend.status === "available"} aria-pressed={backend.status === "available"}>
                    {backend.status}
                  </Chip>
                </SettingsRowActions>
              </SettingsRow>
              {backend.description ? (
                <SettingsRow className="arco-settings-memory-card__desc">
                  <p className="arco-settings-panel__desc">{backend.description}</p>
                </SettingsRow>
              ) : null}
            </SettingsStack>
          ))}
        </div>

        <div className="arco-settings-memory-group">
          <SettingsSubhead><T k={I18nKey.APPS$SETTINGS_EMBEDDERS} /></SettingsSubhead>
          {embedders.map((embedder) => (
            <SettingsStack key={embedder.id}>
              <SettingsRow className="arco-settings-memory-card__header">
                <div className="arco-settings-panel__identity">
                  <span className="arco-settings-panel__title">{embedder.label}</span>
                  <span className="arco-settings-panel__meta">
                    {embedder.dimensions}
                    <T k={I18nKey.APPS$SETTINGS_D} />
                  </span>
                </div>
                <SettingsRowActions>
                  <Chip active={embedder.status === "available"} aria-pressed={embedder.status === "available"}>
                    {embedder.status}
                  </Chip>
                </SettingsRowActions>
              </SettingsRow>
            </SettingsStack>
          ))}
        </div>

        <div className="arco-settings-memory-group">
          <SettingsSubhead><T k={I18nKey.APPS$SETTINGS_AGENT_MEMORY_GRANTS_PREVIEW} /></SettingsSubhead>
          <SettingsStack>
            <div className="arco-settings-account-card__body">
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
            </div>
          </SettingsStack>
        </div>
      </SettingsSection>
    </SettingsPage>
  );
}
