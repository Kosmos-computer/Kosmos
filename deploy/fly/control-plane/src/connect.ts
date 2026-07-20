/**
 * Desktop / www pairing helpers for GET /connect.
 * No IdP — email or instance name lookup, then redirect back to the client.
 */
import type { Store } from "./db.js";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** Allow loopback http(s) return targets used by desktop / vite / electron. */
export function isAllowedReturnTo(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    return LOCAL_HOSTS.has(host);
  } catch {
    return false;
  }
}

export function parseConnectMode(raw: string | null | undefined): "existing" | "signup" {
  return raw === "signup" ? "signup" : "existing";
}

/** Build the desktop callback URL with kosmosInstance + kosmosConnected=1. */
export function buildDesktopReturnUrl(returnTo: string, instanceUrl: string): string {
  const url = new URL(returnTo);
  url.searchParams.set("kosmosInstance", instanceUrl);
  url.searchParams.set("kosmosConnected", "1");
  url.searchParams.delete("kosmosConnectError");
  return url.toString();
}

export function buildDesktopReturnError(returnTo: string, message: string): string {
  const url = new URL(returnTo);
  url.searchParams.set("kosmosConnectError", message);
  url.searchParams.delete("kosmosConnected");
  url.searchParams.delete("kosmosInstance");
  return url.toString();
}

export function tenantOriginFromUrl(tenantUrl: string): string {
  return new URL(tenantUrl).origin;
}

export function resolveOrderInstance(
  store: Store,
  config: { tenantPrefix: string },
  input: { email?: string; tenantName?: string },
): { tenantUrl: string; entryUrl: string | null } | { error: string } {
  const email = input.email?.trim() ?? "";
  const tenantName = input.tenantName?.trim().toLowerCase() ?? "";

  if (email) {
    const order = store.getByEmail(email);
    if (!order) {
      return { error: "No instance found for that email. Try your instance name." };
    }
    if (order.status === "suspended") {
      return { error: "That instance is suspended. Contact support or update billing." };
    }
    if (order.status === "failed") {
      return { error: order.error || "Provisioning failed for that account." };
    }
    if (order.status !== "ready" || !order.tenant_url) {
      return { error: "That instance is still provisioning. Try again in a minute." };
    }
    return {
      tenantUrl: tenantOriginFromUrl(order.tenant_url),
      entryUrl: order.entry_url,
    };
  }

  if (tenantName) {
    const order = store.getByTenantName(tenantName);
    const fallbackUrl = `https://${config.tenantPrefix}-${tenantName}.fly.dev`;
    if (order?.status === "ready" && order.tenant_url) {
      return {
        tenantUrl: tenantOriginFromUrl(order.tenant_url),
        entryUrl: order.entry_url,
      };
    }
    if (order && order.status !== "ready") {
      return { error: "That instance is not ready yet. Try again shortly." };
    }
    // Name known to DNS convention even if not in this CP DB (manual CLI tenants).
    return { tenantUrl: fallbackUrl, entryUrl: null };
  }

  return { error: "Enter your email or instance name." };
}
