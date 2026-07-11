export type {
  DesktopWindowBridge,
  OpenAppWindowPayload,
  PlatformBridge,
  PlatformConfig,
  PlatformKind,
  PlatformOs,
  ShellProfile,
  TitleBarTheme,
} from "./types";

export { buildPlatformConfig, resolveApiBase } from "./config";
export { createWebBridge } from "./webBridge";
export { createCapacitorBridge, isCapacitorRuntimeSync } from "./capacitorBridge";
export { createElectronBridge } from "./electronBridge";
export { createTauriBridge, isTauriRuntimeSync } from "./tauriBridge";
export { installApiBaseInterceptor, setApiBaseInterceptor, getApiBaseInterceptor, setBearerTokenInterceptor, getBearerTokenInterceptor } from "./apiInterceptor";

import { createCapacitorBridge, isCapacitorRuntimeSync } from "./capacitorBridge";
import { createElectronBridge } from "./electronBridge";
import { createTauriBridge, isTauriRuntimeSync } from "./tauriBridge";
import { createWebBridge } from "./webBridge";
import type { PlatformBridge } from "./types";

let cached: PlatformBridge | null = null;

/** Resolve the active shell bridge once per session. */
export async function resolvePlatformBridge(): Promise<PlatformBridge> {
  if (cached) return cached;

  const electron = createElectronBridge();
  if (electron) {
    cached = electron;
    return electron;
  }

  if (isCapacitorRuntimeSync()) {
    const capacitor = await createCapacitorBridge();
    if (capacitor) {
      cached = capacitor;
      return capacitor;
    }
  }

  if (isTauriRuntimeSync()) {
    const tauri = await createTauriBridge();
    if (tauri) {
      cached = tauri;
      return tauri;
    }
  }

  cached = createWebBridge();
  return cached;
}

export function getPlatformBridge(): PlatformBridge {
  if (!cached) {
    const electron = createElectronBridge();
    cached = electron ?? createWebBridge();
  }
  return cached;
}

export function isNativeShell(): boolean {
  const bridge = getPlatformBridge();
  return bridge.config.kind === "desktop" || bridge.config.kind === "mobile";
}

export function isDesktopShell(): boolean {
  return getPlatformBridge().config.kind === "desktop";
}
