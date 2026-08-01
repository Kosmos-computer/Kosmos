/**
 * Desktop / dev-shell callback after control-plane /connect or /welcome redirect.
 * Reads ?kosmosInstance=…&kosmosConnected=1 (& optional kosmosEntry), saves a cloud profile, reloads.
 */
import { normalizeServerUrl, upsertServerProfile } from "./serverProfileStore";

export const KOSMOS_CONNECT_PARAM = {
  connected: "kosmosConnected",
  instance: "kosmosInstance",
  entry: "kosmosEntry",
  error: "kosmosConnectError",
} as const;

export type KosmosConnectPrefill = {
  email?: string;
  tenantName?: string;
};

export function kosmosConnectReturnUrl(
  controlPlaneUrl: string,
  mode: "existing" | "signup" = "existing",
  prefill: KosmosConnectPrefill = {},
): string {
  const base = controlPlaneUrl.replace(/\/+$/, "");
  const returnTo = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  const params = new URLSearchParams({ return_to: returnTo, mode });
  const email = prefill.email?.trim() ?? "";
  const tenantName = prefill.tenantName?.trim().toLowerCase() ?? "";
  if (email) params.set("email", email);
  if (tenantName) params.set("tenantName", tenantName);
  // Desktop signup handoff: skip the web form and continue straight to Stripe.
  if (mode === "signup" && email && tenantName) params.set("continue", "1");
  return `${base}/connect?${params.toString()}`;
}

function stripConnectParams(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const had =
    params.has(KOSMOS_CONNECT_PARAM.connected) ||
    params.has(KOSMOS_CONNECT_PARAM.instance) ||
    params.has(KOSMOS_CONNECT_PARAM.entry) ||
    params.has(KOSMOS_CONNECT_PARAM.error);
  if (!had) return;
  params.delete(KOSMOS_CONNECT_PARAM.connected);
  params.delete(KOSMOS_CONNECT_PARAM.instance);
  params.delete(KOSMOS_CONNECT_PARAM.entry);
  params.delete(KOSMOS_CONNECT_PARAM.error);
  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", next);
}

/**
 * Apply a control-plane redirect if present. Returns true when a reload was triggered.
 * Call once during shell bootstrap before the first React paint.
 */
export function applyKosmosConnectReturn(): boolean {
  if (typeof window === "undefined") return false;

  const params = new URLSearchParams(window.location.search);
  const connectError = params.get(KOSMOS_CONNECT_PARAM.error);
  const instanceRaw = params.get(KOSMOS_CONNECT_PARAM.instance);
  const entryRaw = params.get(KOSMOS_CONNECT_PARAM.entry);
  const connected = params.has(KOSMOS_CONNECT_PARAM.connected);

  if (!connected && !connectError && !instanceRaw) return false;

  stripConnectParams();

  if (connectError) {
    sessionStorage.setItem("arco.kosmosConnectError", connectError);
    return false;
  }

  if (!instanceRaw) return false;

  try {
    const origin = normalizeServerUrl(instanceRaw);
    upsertServerProfile({
      name: origin.replace(/^https?:\/\//, ""),
      url: origin,
      kind: "cloud",
    });

    // Unlock the private entry gate in a separate tab when control-plane provided it.
    // Profile stays on the API origin; the entry URL is path-bearing and must not be stored as apiBase.
    const entryUrl = entryRaw?.trim() ?? "";
    if (entryUrl) {
      try {
        const entry = new URL(entryUrl);
        if (entry.origin === origin && entry.pathname.startsWith("/entry/")) {
          sessionStorage.setItem("arco.kosmosEntryUrl", entry.toString());
          window.open(entry.toString(), "_blank", "noopener,noreferrer");
        }
      } catch {
        // Ignore malformed entry URLs; profile pairing still succeeds.
      }
    }

    // Hard navigation so bootstrap picks up the cloud apiBase (reload alone
    // can race with history.replaceState on some shells).
    const next = `${window.location.pathname}${window.location.hash || ""}`;
    window.location.replace(next);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sessionStorage.setItem("arco.kosmosConnectError", message);
    return false;
  }
}

export function consumeKosmosConnectError(): string | null {
  if (typeof window === "undefined") return null;
  const message = sessionStorage.getItem("arco.kosmosConnectError");
  if (!message) return null;
  sessionStorage.removeItem("arco.kosmosConnectError");
  return message;
}

/** Invitation URL stashed during desktop connect (open once to unlock the cloud gate). */
export function consumeKosmosEntryUrl(): string | null {
  if (typeof window === "undefined") return null;
  const url = sessionStorage.getItem("arco.kosmosEntryUrl");
  if (!url) return null;
  sessionStorage.removeItem("arco.kosmosEntryUrl");
  return url;
}
