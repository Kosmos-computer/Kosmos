/**
 * Settings → Subscriptions / Billing — Kosmos Hosted plan standing, upgrades,
 * storage add-ons, and Stripe portal.
 */
import { useCallback, useEffect, useState } from "react";
import type { BillingAddons, BillingStatus, StorageStatus } from "@shared/types";
import { api } from "../../lib/api";
import { useDeployment } from "../../hooks/useDeployment";
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

const usd = (n: number) => `$${n.toFixed(2)}`;
const mbLabel = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

function statusLabel(status: string | null): string {
  if (!status) return "No subscription";
  return status.replace(/_/g, " ");
}

function StorageBar({ usedMb, totalMb }: { usedMb: number; totalMb: number }) {
  const pct = totalMb > 0 ? Math.min(100, (usedMb / totalMb) * 100) : 100;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Storage used"
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

export function BillingSection() {
  const { deployment, loading: deploymentLoading } = useDeployment();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [addons, setAddons] = useState<BillingAddons | null>(null);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalBusy, setPortalBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [billingStatus, addonData, storageStatus] = await Promise.all([
        api.getBillingStatus(),
        api.getBillingAddons(),
        api.getStorageStatus(),
      ]);
      setBilling(billingStatus);
      setAddons(addonData);
      setStorage(storageStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openPortal = async () => {
    setPortalBusy(true);
    setError(null);
    try {
      const { url } = await api.openBillingPortal();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing portal");
    } finally {
      setPortalBusy(false);
    }
  };

  const startCheckout = async (priceId: string, kind: "storage" | "plan") => {
    setCheckoutBusy(priceId);
    setError(null);
    try {
      const { url } = await api.startBillingCheckout(priceId, kind);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setCheckoutBusy(null);
    }
  };

  const openSignup = () => {
    const url = billing?.signupUrl ?? deployment.signupUrl;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const managed = billing?.managed ?? deployment.billingManaged;
  const showHostedPlan = managed || deployment.deployment === "fly-tenant";
  const hasUpgradePlans = (addons?.upgradePlans.length ?? 0) > 0;
  const hasStorageAddons = (addons?.storageAddons.length ?? 0) > 0;

  return (
    <SettingsPage>
      <SettingsSection intro="Kosmos Hosted subscription, workspace storage, and payment method. Token spend is under Usage & credits.">
        <SettingsStack>
          {error && <SettingsAlert>{error}</SettingsAlert>}

          {!showHostedPlan && !deploymentLoading && (
            <SettingsPanel>
              <SettingsPanelHeader>
                <span className="arco-settings-panel__title">Local instance</span>
              </SettingsPanelHeader>
              <SettingsPanelBody>
                <p className="arco-settings-panel__desc">
                  This instance runs locally. Subscribe to Kosmos Hosted for a managed cloud workspace,
                  then connect from Settings → Kosmos Cloud on desktop.
                </p>
                <div className="arco-settings-panel__actions">
                  <Button onClick={openSignup}>Create cloud account</Button>
                </div>
              </SettingsPanelBody>
            </SettingsPanel>
          )}

          {showHostedPlan && (
            <SettingsPanel>
              <SettingsPanelHeader>
                <span className="arco-settings-panel__title">Kosmos Hosted</span>
                {billing?.tenantApp && (
                  <span className="arco-settings-panel__meta">{billing.tenantApp}</span>
                )}
              </SettingsPanelHeader>
              <SettingsPanelBody>
                <SettingsFieldRow label="Plan">
                  <span>{billing?.planName ?? "Kosmos Hosted"}</span>
                </SettingsFieldRow>
                {billing?.planPriceLabel && (
                  <SettingsFieldRow label="Price">
                    <span>{billing.planPriceLabel}</span>
                  </SettingsFieldRow>
                )}
                {billing?.includedCreditsUsd != null && (
                  <SettingsFieldRow label="Included credits">
                    <span>{usd(billing.includedCreditsUsd)} / month</span>
                  </SettingsFieldRow>
                )}
                <SettingsFieldRow label="Subscription">
                  <span>{statusLabel(billing?.subscriptionStatus ?? null)}</span>
                </SettingsFieldRow>
                {billing?.cancelAtPeriodEnd && (
                  <SettingsAlert tone="muted">Cancels at end of billing period.</SettingsAlert>
                )}
                {billing?.currentPeriodEnd && (
                  <SettingsFieldRow label="Renews">
                    <span>{new Date(billing.currentPeriodEnd).toLocaleDateString()}</span>
                  </SettingsFieldRow>
                )}
                {billing?.checkoutEmail && (
                  <SettingsFieldRow label="Billing email">
                    <span>{billing.checkoutEmail}</span>
                  </SettingsFieldRow>
                )}
                {billing?.tenantUrl && (
                  <SettingsFieldRow label="Instance">
                    <span>{billing.tenantUrl}</span>
                  </SettingsFieldRow>
                )}
              </SettingsPanelBody>
            </SettingsPanel>
          )}

          {showHostedPlan && hasUpgradePlans && (
            <SettingsPanel>
              <SettingsPanelHeader>
                <span className="arco-settings-panel__title">Upgrade plan</span>
              </SettingsPanelHeader>
              <SettingsPanelBody>
                <SettingsAlert tone="muted">
                  Switch to a higher tier for more included credits and workspace storage each month.
                </SettingsAlert>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {addons?.upgradePlans.map((plan) => (
                    <Button
                      key={plan.priceId}
                      variant="primary"
                      onClick={() => void startCheckout(plan.priceId, "plan")}
                      disabled={checkoutBusy === plan.priceId}
                    >
                      {checkoutBusy === plan.priceId
                        ? "Opening…"
                        : `${plan.name}${plan.monthlyPriceUsd != null ? ` — $${plan.monthlyPriceUsd}/mo` : ""}`}
                    </Button>
                  ))}
                </div>
              </SettingsPanelBody>
            </SettingsPanel>
          )}

          {showHostedPlan && storage && (
            <SettingsPanel>
              <SettingsPanelHeader>
                <span className="arco-settings-panel__title">Workspace storage</span>
              </SettingsPanelHeader>
              <SettingsPanelBody>
                <StorageBar usedMb={storage.usedMb} totalMb={storage.totalQuotaMb} />
                <SettingsFieldRow label="Used">
                  <span>
                    {mbLabel(storage.usedMb)} of {mbLabel(storage.totalQuotaMb)}
                  </span>
                </SettingsFieldRow>
                {storage.extraQuotaMb > 0 && (
                  <SettingsFieldRow label="Add-on storage">
                    <span>+{mbLabel(storage.extraQuotaMb)}</span>
                  </SettingsFieldRow>
                )}
                {hasStorageAddons ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    {addons?.storageAddons.map((addon) => (
                      <Button
                        key={addon.priceId}
                        onClick={() => void startCheckout(addon.priceId, "storage")}
                        disabled={checkoutBusy === addon.priceId}
                      >
                        {checkoutBusy === addon.priceId ? "Opening…" : `Add ${addon.label}`}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <SettingsAlert tone="muted">
                    Storage add-ons are not configured yet. Contact support to increase your workspace quota.
                  </SettingsAlert>
                )}
              </SettingsPanelBody>
            </SettingsPanel>
          )}

          {showHostedPlan && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {managed && deployment.billingConfigured && (
                <Button onClick={() => void openPortal()} disabled={portalBusy}>
                  {portalBusy ? "Opening…" : "Manage billing"}
                </Button>
              )}
              {!managed && billing?.portalLoginUrl && (
                <Button
                  onClick={() =>
                    window.open(billing.portalLoginUrl!, "_blank", "noopener,noreferrer")
                  }
                >
                  Customer portal login
                </Button>
              )}
              <Button variant="ghost" onClick={() => void load()} disabled={loading}>
                {loading ? "Refreshing…" : "Refresh"}
              </Button>
            </div>
          )}
        </SettingsStack>
      </SettingsSection>
    </SettingsPage>
  );
}
