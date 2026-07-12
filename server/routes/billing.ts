/**
 * GET /api/billing/status, POST /api/billing/portal, GET /api/billing/addons,
 * POST /api/billing/checkout — proxies to kosmos-control-plane using
 * KOSMOS_TENANT_BILLING_TOKEN (set at provision time).
 */
import { Hono } from "hono";
import type { BillingAddons, BillingStatus } from "../../shared/types.js";
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
    planQuotaMb: null,
    extraQuotaMb: null,
    totalQuotaMb: null,
    controlPlaneUrl: kosmos.controlPlaneUrl,
    signupUrl: kosmos.signupUrl,
    paymentLinkUrl: kosmos.paymentLinkUrl,
    portalLoginUrl: kosmos.portalLoginUrl,
    checkoutEnabled: false,
  };
}

async function tenantFetch<T>(
  hosted: boolean,
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const kosmos = getKosmosDeployment(hosted);
  if (!kosmos.billingConfigured || !kosmos.controlPlaneUrl) return null;
  const token = process.env.KOSMOS_TENANT_BILLING_TOKEN?.trim();
  if (!token) return null;

  const res = await fetch(`${kosmos.controlPlaneUrl}/api/tenant${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

async function fetchManagedBilling(hosted: boolean): Promise<BillingStatus> {
  const kosmos = getKosmosDeployment(hosted);
  if (!kosmos.billingConfigured || !kosmos.controlPlaneUrl) {
    return { ...localBillingStatus(hosted), managed: kosmos.billingManaged };
  }
  const data = await tenantFetch<BillingStatus>(hosted, "/billing");
  if (!data) return { ...localBillingStatus(hosted), managed: true };
  return data;
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

billingRoutes.get("/addons", async (c) => {
  const hosted = isHostedRuntime();
  const kosmos = getKosmosDeployment(hosted);
  if (!kosmos.billingConfigured) {
    return c.json({ creditPacks: [], storageAddons: [], upgradePlans: [], currentPlan: null });
  }
  const data = await tenantFetch<BillingAddons>(hosted, "/billing/addons");
  return c.json(
    data ?? { creditPacks: [], storageAddons: [], upgradePlans: [], currentPlan: null },
  );
});

billingRoutes.post("/checkout", async (c) => {
  const hosted = isHostedRuntime();
  const kosmos = getKosmosDeployment(hosted);
  if (!kosmos.billingConfigured) {
    return c.json({ error: "billing_not_configured" }, 400);
  }
  const body = await c.req.text();
  const data = await tenantFetch<{ url: string }>(hosted, "/billing/checkout", {
    method: "POST",
    body,
  });
  if (!data?.url) return c.json({ error: "checkout_unavailable" }, 502);
  return c.json(data);
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
