import { resolveApiBase } from "./config";
import type { PlatformConfig } from "./types";

const PREFIXED = ["/api/", "/apps/", "/app-sdk.js"];

function shouldPrefix(url: string): boolean {
  if (url.startsWith("http://") || url.startsWith("https://")) return false;
  return PREFIXED.some((prefix) => url === prefix || url.startsWith(prefix));
}

/** Prefix relative API/app paths when running against a remote backend (Tauri mobile prototype). */
export function installApiBaseInterceptor(config: PlatformConfig): void {
  const base = resolveApiBase(config);
  if (!base) return;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (typeof input === "string" && shouldPrefix(input)) {
      return nativeFetch(`${base}${input}`, init);
    }
    if (input instanceof Request) {
      const url = input.url;
      const path = url.startsWith(window.location.origin)
        ? url.slice(window.location.origin.length)
        : url;
      if (shouldPrefix(path)) {
        return nativeFetch(`${base}${path}`, init);
      }
    }
    return nativeFetch(input, init);
  };
}
