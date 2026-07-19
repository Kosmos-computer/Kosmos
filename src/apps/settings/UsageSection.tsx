/**
 * Settings → Usage & credits — the instance's cumulative token meter, plus
 * live budget standing when the model endpoint is a credits gateway
 * (hosted instances; LiteLLM /key/info via GET /api/usage).
 */
import { useCallback, useEffect, useState } from "react";
import type { BillingAddons, UsageResponse } from "@shared/types";
import { api } from "../../lib/api";
import { useDeployment } from "../../hooks/useDeployment";
import {
  SettingsAlert,
  SettingsFieldRow,
  SettingsPage,
  SettingsRow,
  SettingsRowActions,
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
      className="arco-settings-budget-bar"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Credits used"
    >
      <div
        className={[
          "arco-settings-budget-bar__fill",
          pct >= 90 ? "arco-settings-budget-bar__fill--danger" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function UsageSection() {
  const { deployment } = useDeployment();
  const [data, setData] = useState<UsageResponse | null>(null);
  const [addons, setAddons] = useState<BillingAddons | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const [usage, addonData] = await Promise.all([
        api.getUsage(refresh),
        deployment.billingConfigured ? api.getBillingAddons() : Promise.resolve(null),
      ]);
      setData(usage);
      setAddons(addonData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage");
    } finally {
      setLoading(false);
    }
  }, [deployment.billingConfigured]);

  useEffect(() => {
    void load();
  }, [load]);

  const startCheckout = async (priceId: string) => {
    setCheckoutBusy(priceId);
    setError(null);
    try {
      const { url } = await api.startBillingCheckout(priceId, "credits");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setCheckoutBusy(null);
    }
  };

  const credits = data?.credits ?? null;
  const local = data?.local ?? null;
  const hasCreditPacks = (addons?.creditPacks.length ?? 0) > 0;
  const lowCredits =
    credits?.maxBudget != null &&
    credits.remaining != null &&
    credits.maxBudget > 0 &&
    credits.remaining / credits.maxBudget <= 0.1;

  const refreshButton = (
    <Button onClick={() => void load(true)} disabled={loading}>
      {loading ? "Refreshing…" : "Refresh"}
    </Button>
  );

  return (
    <SettingsPage>
      <SettingsSection intro="Token spend for this instance. Buy more credits when your budget runs low.">
        {error ? <SettingsAlert>{error}</SettingsAlert> : null}

        {credits ? (
          <SettingsStack>
            <SettingsRow className="arco-settings-usage-card__header">
              <div className="arco-settings-panel__identity">
                <span className="arco-settings-panel__title">Credits</span>
                {credits.keyAlias ? (
                  <span className="arco-settings-panel__meta">{credits.keyAlias}</span>
                ) : null}
              </div>
              <SettingsRowActions>{refreshButton}</SettingsRowActions>
            </SettingsRow>
            {credits.maxBudget !== null ? (
              <SettingsRow className="arco-settings-usage-card__bar">
                <BudgetBar spend={credits.spend} maxBudget={credits.maxBudget} />
              </SettingsRow>
            ) : null}
            <SettingsFieldRow label="Spent">
              <span className="arco-settings-usage-value">{usd(credits.spend)}</span>
            </SettingsFieldRow>
            {credits.maxBudget !== null ? (
              <SettingsFieldRow label="Remaining">
                <span className="arco-settings-usage-value">
                  {usd(credits.remaining ?? 0)} of {usd(credits.maxBudget)}
                </span>
              </SettingsFieldRow>
            ) : null}
            {lowCredits ? (
              <SettingsRow className="arco-settings-usage-card__note">
                <p className="arco-settings-panel__desc">
                  Credits are running low. Buy more to keep using the agent without interruption.
                </p>
              </SettingsRow>
            ) : null}
            {hasCreditPacks ? (
              <SettingsRow className="arco-settings-usage-card__actions">
                <SettingsRowActions>
                  {addons?.creditPacks.map((pack) => (
                    <Button
                      key={pack.priceId}
                      variant="primary"
                      onClick={() => void startCheckout(pack.priceId)}
                      disabled={checkoutBusy === pack.priceId}
                    >
                      {checkoutBusy === pack.priceId ? "Opening…" : `Buy ${pack.label}`}
                    </Button>
                  ))}
                </SettingsRowActions>
              </SettingsRow>
            ) : deployment.billingConfigured ? (
              <SettingsRow className="arco-settings-usage-card__note">
                <p className="arco-settings-panel__desc">
                  Credit top-ups are not configured yet. Open Billing to manage your subscription.
                </p>
              </SettingsRow>
            ) : null}
          </SettingsStack>
        ) : null}

        {local ? (
          <SettingsStack>
            <SettingsRow className="arco-settings-usage-card__header">
              <div className="arco-settings-panel__identity">
                <span className="arco-settings-panel__title">Tokens used</span>
                <span className="arco-settings-panel__meta">
                  since {new Date(local.since).toLocaleDateString()}
                  {!credits ? " · counted locally" : ""}
                </span>
              </div>
              {!credits ? <SettingsRowActions>{refreshButton}</SettingsRowActions> : null}
            </SettingsRow>

            {!credits ? (
              <SettingsRow className="arco-settings-usage-card__note">
                <p className="arco-settings-panel__desc">
                  No credits gateway detected — the current provider doesn&apos;t report a budget.
                  Totals below are counted on this instance.
                </p>
              </SettingsRow>
            ) : null}

            <SettingsRow className="arco-settings-usage-hero">
              <span className="arco-settings-usage-hero__value">{num.format(local.totalTokens)}</span>
              <span className="arco-settings-usage-hero__label">Total tokens</span>
            </SettingsRow>

            <SettingsRow className="arco-settings-usage-stats">
              <div className="arco-settings-usage-stat">
                <span className="arco-settings-usage-stat__value">{num.format(local.promptTokens)}</span>
                <span className="arco-settings-usage-stat__label">Prompt</span>
              </div>
              <div className="arco-settings-usage-stat">
                <span className="arco-settings-usage-stat__value">
                  {num.format(local.completionTokens)}
                </span>
                <span className="arco-settings-usage-stat__label">Completion</span>
              </div>
              <div className="arco-settings-usage-stat">
                <span className="arco-settings-usage-stat__value">{num.format(local.turns)}</span>
                <span className="arco-settings-usage-stat__label">Completions</span>
              </div>
            </SettingsRow>
          </SettingsStack>
        ) : null}

        {!local && !credits && !loading && !error ? (
          <SettingsStack>
            <SettingsRow className="arco-settings-usage-card__header">
              <div className="arco-settings-panel__identity">
                <span className="arco-settings-panel__title">Usage</span>
                <span className="arco-settings-panel__meta">No usage recorded yet</span>
              </div>
              <SettingsRowActions>{refreshButton}</SettingsRowActions>
            </SettingsRow>
          </SettingsStack>
        ) : null}
      </SettingsSection>
    </SettingsPage>
  );
}
