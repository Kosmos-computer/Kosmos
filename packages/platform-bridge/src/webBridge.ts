import { buildPlatformConfig } from "./config";
import type { PlatformBridge } from "./types";

export function createWebBridge(): PlatformBridge {
  return {
    config: buildPlatformConfig({
      kind: "web",
      os: "web",
      version: "web",
    }),
    desktop: null,
    openExternal: async (url) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
  };
}
