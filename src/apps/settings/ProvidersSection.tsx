import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Settings → Default providers — which implementation answers each capability
 * contract (os.calendar@1, …). "System" is the built-in service; installed
 * apps that declare `implements: [contract]` appear as alternatives.
 */
import { useEffect, useState } from "react";
import { api, type CapabilityProviderInfo } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import {
  SettingsAlert,
  SettingsEmpty,
  SettingsPage,
  SettingsRow,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
} from "../../components/patterns";

export function ProvidersSection() {
  const canManage = useCan("settings:write");
  const [providers, setProviders] = useState<CapabilityProviderInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setProviders(await api.getCapabilityProviders());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const pick = async (contractId: string, providerId: string) => {
    try {
      await api.setCapabilityProvider(contractId, providerId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set provider");
    }
  };

  if (providers.length === 0 && !error) return null;

  return (
    <SettingsPage>
      <SettingsSection intro={i18n.t(I18nKey.APPS$SETTINGS_WHICH_IMPLEMENTATION_ANSWERS_EACH_SYSTEM_CAPABILITY_DATA)}>
        {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}
        <SettingsStack>
          {providers.map((p) => (
            <SettingsRow key={p.contractId}>
              <code className="arco-code arco-settings-row__label">{p.contractId}</code>
              <SettingsRowActions>
                <select
                  className="arco-input arco-input--narrow"
                  value={p.provider}
                  disabled={!canManage}
                  onChange={(e) => void pick(p.contractId, e.target.value)}
                  aria-label={`Provider for ${p.contractId}`}
                >
                  {p.options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </SettingsRowActions>
            </SettingsRow>
          ))}
        </SettingsStack>
        {providers.length === 0 && !error ? <SettingsEmpty><T k={I18nKey.APPS$SETTINGS_NO_CAPABILITY_PROVIDERS_CONFIGURED} /></SettingsEmpty> : null}
      </SettingsSection>
    </SettingsPage>
  );
}
