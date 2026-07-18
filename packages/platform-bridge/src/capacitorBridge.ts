import { buildPlatformConfig } from "./config";
import type { PlatformBridge } from "./types";

function isCapacitorRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

export function isCapacitorRuntimeSync(): boolean {
  return isCapacitorRuntime();
}

export async function createCapacitorBridge(): Promise<PlatformBridge | null> {
  if (!isCapacitorRuntime()) return null;

  const { Capacitor } = await import("@capacitor/core");
  const platform = Capacitor.getPlatform();
  const os = platform === "ios" ? "ios" : platform === "android" ? "android" : "web";

  return {
    config: buildPlatformConfig({
      kind: "mobile",
      os,
      version: "mobile",
      shellProfile: "mobile",
    }),
    desktop: null,
    browserGrab: null,
    openExternal: async (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  };
}
