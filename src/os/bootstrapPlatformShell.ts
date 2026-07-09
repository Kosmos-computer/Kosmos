/**
 * Bootstrap platform flags before the first React paint.
 * Replaces Electron-only bootstrap for multi-shell support.
 */
import {
  getPlatformBridge,
  installApiBaseInterceptor,
  resolvePlatformBridge,
} from "@arco/platform-bridge";

export async function bootstrapPlatformShell(): Promise<void> {
  await resolvePlatformBridge();
  const bridge = getPlatformBridge();
  const { config } = bridge;

  installApiBaseInterceptor(config);

  const root = document.documentElement;
  root.dataset.platform = config.os;
  root.dataset.shell = config.kind;

  if (config.kind === "desktop" && bridge.desktop) {
    root.dataset.electron = "true";
    root.classList.add("arco-electron");
    document.body.classList.add("arco-electron");
  }

  if (config.kind === "mobile") {
    root.classList.add("arco-mobile-native");
    document.body.classList.add("arco-mobile-native");
  }
}
