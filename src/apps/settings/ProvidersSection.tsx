/**
 * Settings → Default providers — which implementation answers each capability
 * contract (os.calendar@1, …). "System" is the built-in service; installed
 * apps that declare `implements: [contract]` appear as alternatives. Callers
 * (agent tools, app intents) never notice a swap — the capability registry
 * re-routes and the canonical data store stays put.
 */
import { useEffect, useState } from "react";
import { api, type CapabilityProviderInfo } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";

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
    <section className="arco-form">
      <strong>Default providers</strong>
      <span style={{ color: "var(--arco-text-secondary)", fontSize: "var(--arco-text-sm)" }}>
        Which implementation answers each system capability. Data stays in the system store, so
        switching providers never loses anything.
      </span>
      {error && (
        <span style={{ color: "var(--arco-danger, #e5484d)", fontSize: "var(--arco-text-sm)" }}>
          {error}
        </span>
      )}
      {providers.map((p) => (
        <div key={p.contractId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <code style={{ flex: 1, fontSize: "var(--arco-text-sm)" }}>{p.contractId}</code>
          <select
            className="arco-input"
            style={{ width: 180 }}
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
        </div>
      ))}
    </section>
  );
}
