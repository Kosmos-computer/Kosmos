/**
 * Kosmos Cloud deployment signals — read from KOSMOS_* env vars set at
 * provision time by kosmos-control-plane (distinct from ARCO_* runtime config).
 */
import type { KosmosDeployment } from "../../shared/types.js";

const PAYMENT_LINK_FALLBACK = "https://buy.stripe.com/3cIcN71uN44T3gy5Uzak000";
const PORTAL_LOGIN_FALLBACK = "https://billing.stripe.com/p/login/3cIcN71uN44T3gy5Uzak000";
const CONTROL_PLANE_FALLBACK = "https://kosmos-control-plane.fly.dev";

export function kosmosSignupUrl(controlPlaneUrl: string | null): string {
  const base = (controlPlaneUrl ?? CONTROL_PLANE_FALLBACK).replace(/\/+$/, "");
  return `${base}/signup`;
}

export function getKosmosDeployment(hosted: boolean): KosmosDeployment {
  const billingManaged = process.env.KOSMOS_BILLING_MANAGED === "1";
  const tenantApp = process.env.KOSMOS_TENANT_APP?.trim() || null;
  const controlPlaneUrl = process.env.KOSMOS_CONTROL_PLANE_URL?.replace(/\/+$/, "") || null;
  const billingToken = process.env.KOSMOS_TENANT_BILLING_TOKEN?.trim() || null;

  let deployment: KosmosDeployment["deployment"] = "desktop-local";
  if (billingManaged && hosted) deployment = "fly-tenant";
  else if (hosted) deployment = "self-host";
  else if (process.env.KOSMOS_MOBILE_REMOTE === "1") deployment = "mobile-remote";

  return {
    deployment,
    billingManaged,
    tenantApp,
    tenantUrl: tenantApp ? `https://${tenantApp}.fly.dev` : null,
    controlPlaneUrl: controlPlaneUrl ?? CONTROL_PLANE_FALLBACK,
    signupUrl: kosmosSignupUrl(controlPlaneUrl),
    paymentLinkUrl: process.env.KOSMOS_PAYMENT_LINK_URL?.trim() || PAYMENT_LINK_FALLBACK,
    portalLoginUrl: process.env.KOSMOS_PORTAL_LOGIN_URL?.trim() || PORTAL_LOGIN_FALLBACK,
    billingConfigured: billingManaged && !!controlPlaneUrl && !!billingToken,
  };
}
