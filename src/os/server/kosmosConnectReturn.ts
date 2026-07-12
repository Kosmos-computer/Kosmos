/**
 * Desktop / dev-shell callback after control-plane /connect or /welcome redirect.
 * Reads ?kosmosInstance=…&kosmosConnected=1, saves a cloud profile, reloads.
 */
import {
  normalizeServerUrl,
  reloadForServerSwitch,
  upsertServerProfile,
} from "./serverProfileStore";

export const KOSMOS_CONNECT_PARAM = {
  connected: "kosmosConnected",
  instance: "kosmosInstance",
  error: "kosmosConnectError",
} as const;

export function kosmosConnectReturnUrl(controlPlaneUrl: string, mode: "existing" | "signup" = "existing"): string {
  const base = controlPlaneUrl.replace(/\/+$/, "");
  const returnTo = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
  const params = new URLSearchParams({ return_to: returnTo, mode });
  return `${base}/connect?${params.toString()}`;
}

function stripConnectParams(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const had =
    params.has(KOSMOS_CONNECT_PARAM.connected) ||
    params.has(KOSMOS_CONNECT_PARAM.instance) ||
    params.has(KOSMOS_CONNECT_PARAM.error);
  if (!had) return;
  params.delete(KOSMOS_CONNECT_PARAM.connected);
  params.delete(KOSMOS_CONNECT_PARAM.instance);
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
    reloadForServerSwitch();
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
