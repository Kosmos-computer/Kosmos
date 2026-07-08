/**
 * Settings → Usage & credits — the instance's cumulative token meter, plus
 * live budget standing when the model endpoint is a credits gateway
 * (hosted instances; LiteLLM /key/info via GET /api/usage).
 */
import { useCallback, useEffect, useState } from "react";
import type { UsageResponse } from "@shared/types";
import { api } from "../../lib/api";
import {
  SettingsAlert,
  SettingsFieldRow,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsSection,
  SettingsStack,
} from "../../components/patterns";
import { Button } from "../../components/ui";

const num = new Intl.NumberFormat("en-US");
const usd = (n: number) => `$${n.toFixed(2)}`;

function BudgetBar({ spend, maxBudget }: { spend: number; maxBudget: number }) {
  const pct = maxBudget > 0 ? Math.min(100, (spend / maxBudget) * 100) : 100;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Credits used"
      style={{ height: 6, borderRadius: 999, background: "var(--arco-border)", overflow: "hidden" }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 999,
          background: pct >= 90 ? "var(--arco-danger)" : "var(--arco-accent)",
        }}
      />
    </div>
  );
}

export function UsageSection() {
  const [data, setData] = useState<UsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.getUsage(refresh));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const credits = data?.credits ?? null;
  const local = data?.local ?? null;

  return (
    <SettingsPage>
      <SettingsSection intro="Token spend for this instance. Credits appear when the model provider is a metered gateway.">
        <SettingsStack>
          {error && <SettingsAlert>{error}</SettingsAlert>}

          {credits && (
            <SettingsPanel>
              <SettingsPanelHeader>
                <span className="arco-settings-panel__title">Credits</span>
                {credits.keyAlias && <span className="arco-settings-panel__meta">{credits.keyAlias}</span>}
              </SettingsPanelHeader>
              <SettingsPanelBody>
                {credits.maxBudget !== null && (
                  <BudgetBar spend={credits.spend} maxBudget={credits.maxBudget} />
                )}
                <SettingsFieldRow label="Spent">
                  <span>{usd(credits.spend)}</span>
                </SettingsFieldRow>
                {credits.maxBudget !== null && (
                  <SettingsFieldRow label="Remaining">
                    <span>
                      {usd(credits.remaining ?? 0)} of {usd(credits.maxBudget)}
                    </span>
                  </SettingsFieldRow>
                )}
              </SettingsPanelBody>
            </SettingsPanel>
          )}

          {!credits && !loading && !error && (
            <SettingsAlert tone="muted">
              No credits gateway detected — the current provider doesn't report a budget. Token totals
              below are counted locally.
            </SettingsAlert>
          )}

          {local && (
            <SettingsPanel>
              <SettingsPanelHeader>
                <span className="arco-settings-panel__title">Tokens used</span>
                <span className="arco-settings-panel__meta">
                  since {new Date(local.since).toLocaleDateString()}
                </span>
              </SettingsPanelHeader>
              <SettingsPanelBody>
                <SettingsFieldRow label="Total">
                  <span>{num.format(local.totalTokens)}</span>
                </SettingsFieldRow>
                <SettingsFieldRow label="Prompt">
                  <span>{num.format(local.promptTokens)}</span>
                </SettingsFieldRow>
                <SettingsFieldRow label="Completion">
                  <span>{num.format(local.completionTokens)}</span>
                </SettingsFieldRow>
                <SettingsFieldRow label="Completions">
                  <span>{num.format(local.turns)}</span>
                </SettingsFieldRow>
              </SettingsPanelBody>
            </SettingsPanel>
          )}

          <div>
            <Button onClick={() => void load(true)} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </SettingsStack>
      </SettingsSection>
    </SettingsPage>
  );
}
