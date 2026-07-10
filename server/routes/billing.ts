/**
 * GET /api/billing/status, POST /api/billing/portal — proxies to kosmos-control-plane
 * using KOSMOS_TENANT_BILLING_TOKEN (set at provision time).
 */
import { Hono } from "hono";
import type { BillingStatus } from "../../shared/types.js";
import { getKosmosDeployment } from "../system/kosmosDeployment.js";
import { isHostedRuntime } from "../system/workspaceFeatures.js";

function localBillingStatus(hosted: boolean): BillingStatus {
  const kosmos = getKosmosDeployment(hosted);
  return {
    managed: false,
    tenantApp: kosmos.tenantApp,
    tenantUrl: kosmos.tenantUrl,
    checkoutEmail: null,
    planName: null,
    planPriceLabel: null,
    includedCreditsUsd: null,
    subscriptionStatus: null,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    controlPlaneUrl: kosmos.controlPlaneUrl,
    paymentLinkUrl: kosmos.paymentLinkUrl,
    portalLoginUrl: kosmos.portalLoginUrl,
  };
}

async function fetchManagedBilling(hosted: boolean): Promise<BillingStatus> {
  const kosmos = getKosmosDeployment(hosted);
  if (!kosmos.billingConfigured || !kosmos.controlPlaneUrl) {
    return { ...localBillingStatus(hosted), managed: kosmos.billingManaged };
  }
  const token = process.env.KOSMOS_TENANT_BILLING_TOKEN?.trim();
  if (!token) return localBillingStatus(hosted);

  const res = await fetch(`${kosmos.controlPlaneUrl}/api/tenant/billing`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    return { ...localBillingStatus(hosted), managed: true };
  }
  return (await res.json()) as BillingStatus;
}

export const billingRoutes = new Hono();

billingRoutes.get("/status", async (c) => {
  const hosted = isHostedRuntime();
  const kosmos = getKosmosDeployment(hosted);
  if (!kosmos.billingConfigured) {
    return c.json(localBillingStatus(hosted));
  }
  return c.json(await fetchManagedBilling(hosted));
});

billingRoutes.post("/portal", async (c) => {
  const hosted = isHostedRuntime();
  const kosmos = getKosmosDeployment(hosted);
  if (!kosmos.billingConfigured || !kosmos.controlPlaneUrl) {
    return c.json({ error: "billing_not_configured" }, 400);
  }
  const token = process.env.KOSMOS_TENANT_BILLING_TOKEN?.trim();
  if (!token) return c.json({ error: "billing_not_configured" }, 400);

  const res = await fetch(`${kosmos.controlPlaneUrl}/api/tenant/billing/portal`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    return c.json({ error: "portal_unavailable" }, 502);
  }
  return c.json(await res.json());
});
