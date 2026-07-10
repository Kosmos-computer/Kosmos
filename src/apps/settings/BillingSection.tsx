/**
 * Settings → Subscriptions / Billing — Kosmos Hosted plan standing and Stripe portal.
 */
import { useCallback, useEffect, useState } from "react";
import type { BillingStatus } from "@shared/types";
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

function statusLabel(status: string | null): string {
  if (!status) return "No subscription";
  return status.replace(/_/g, " ");
}

export function BillingSection() {
  const { deployment, loading: deploymentLoading } = useDeployment();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalBusy, setPortalBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBilling(await api.getBillingStatus());
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

  const openPaymentLink = () => {
    const url = billing?.paymentLinkUrl ?? deployment.paymentLinkUrl;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const managed = billing?.managed ?? deployment.billingManaged;
  const showHostedPlan = managed || deployment.deployment === "fly-tenant";

  return (
    <SettingsPage>
      <SettingsSection intro="Kosmos Hosted subscription, invoices, and payment method. Token spend is under Usage & credits.">
        <SettingsStack>
          {error && <SettingsAlert>{error}</SettingsAlert>}

          {!showHostedPlan && !deploymentLoading && (
            <SettingsPanel>
              <SettingsPanelHeader>
                <span className="arco-settings-panel__title">Local instance</span>
              </SettingsPanelHeader>
              <SettingsPanelBody>
                <SettingsAlert tone="muted">
                  This instance runs locally. Subscribe to Kosmos Hosted for a managed cloud workspace,
                  then connect from Settings → Kosmos Cloud on desktop.
                </SettingsAlert>
                <div>
                  <Button onClick={openPaymentLink}>Create cloud account</Button>
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
