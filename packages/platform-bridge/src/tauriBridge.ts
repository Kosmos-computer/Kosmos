import { buildPlatformConfig } from "./config";
import type { PlatformBridge } from "./types";

interface TauriPlatformInfo {
  kind: "desktop" | "mobile";
  os: string;
  version: string;
  apiBase?: string | null;
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function createTauriBridge(): Promise<PlatformBridge | null> {
  if (!isTauriRuntime()) return null;

  const { invoke } = await import("@tauri-apps/api/core");
  const info = await invoke<TauriPlatformInfo>("platform_info");

  return {
    config: buildPlatformConfig({
      kind: info.kind,
      os: info.os,
      version: info.version,
      shellProfile: info.kind === "mobile" ? "mobile" : "auto",
      apiBase: info.apiBase ?? null,
    }),
    desktop: null,
    openExternal: async (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  };
}

export function isTauriRuntimeSync(): boolean {
  return isTauriRuntime();
}
