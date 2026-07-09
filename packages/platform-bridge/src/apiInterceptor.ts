import { resolveApiBase } from "./config";
import type { PlatformConfig } from "./types";

const PREFIXED = ["/api/", "/apps/", "/app-sdk.js"];

let activeApiBase: string | null = null;
let bearerToken: string | null = null;
let nativeFetch: typeof fetch | null = null;

function shouldPrefix(url: string): boolean {
  if (url.startsWith("http://") || url.startsWith("https://")) return false;
  return PREFIXED.some((prefix) => url === prefix || url.startsWith(prefix));
}

function prefixUrl(path: string): string {
  const base = activeApiBase;
  if (!base) return path;
  return `${base}${path}`;
}

function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const fetchImpl = nativeFetch ?? window.fetch.bind(window);
  const creds = init?.credentials ?? "include";
  const headers = new Headers(init?.headers);
  if (bearerToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${bearerToken}`);
  }

  if (typeof input === "string" && shouldPrefix(input)) {
    return fetchImpl(prefixUrl(input), { ...init, credentials: creds, headers });
  }
  if (input instanceof Request) {
    const url = input.url;
    const path = url.startsWith(window.location.origin)
      ? url.slice(window.location.origin.length)
      : url;
    if (shouldPrefix(path)) {
      return fetchImpl(prefixUrl(path), { ...init, credentials: creds, headers });
    }
  }
  return fetchImpl(input, { ...init, credentials: creds, headers });
}

/** Prefix relative API/app paths when running against a remote backend (mobile / Tauri). */
export function installApiBaseInterceptor(config: PlatformConfig): void {
  if (!nativeFetch) {
    nativeFetch = window.fetch.bind(window);
    window.fetch = patchedFetch;
  }
  activeApiBase = resolveApiBase(config);
}

/** Update API origin at runtime (mobile server profile switch). */
export function setApiBaseInterceptor(base: string | null): void {
  if (!nativeFetch) {
    nativeFetch = window.fetch.bind(window);
    window.fetch = patchedFetch;
  }
  activeApiBase = base?.replace(/\/$/, "") ?? null;
}

/** Bearer token for cross-origin mobile shells where cookies are not sent. */
export function setBearerTokenInterceptor(token: string | null): void {
  if (!nativeFetch) {
    nativeFetch = window.fetch.bind(window);
    window.fetch = patchedFetch;
  }
  bearerToken = token?.trim() || null;
}

export function getBearerTokenInterceptor(): string | null {
  return bearerToken;
}

export function getApiBaseInterceptor(): string | null {
  return activeApiBase;
}
