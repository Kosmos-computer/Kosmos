/**
 * Bootstrap platform flags before the first React paint.
 * Mobile shells load apiBase from saved server profiles when bundled.
 */
import {
  getPlatformBridge,
  installApiBaseInterceptor,
  resolvePlatformBridge,
} from "@arco/platform-bridge";
import { getActiveServerUrl, hasActiveServerProfile } from "./server/serverProfileStore";
import { mobileShellNeedsServerProfile } from "./server/mobileShellMode";

export async function bootstrapPlatformShell(): Promise<void> {
  const needsProfile = mobileShellNeedsServerProfile();
  const profileUrl = needsProfile ? getActiveServerUrl() : null;

  if (profileUrl) {
    window.__ARCO_PLATFORM__ = {
      ...window.__ARCO_PLATFORM__,
      apiBase: profileUrl,
    };
  }

  await resolvePlatformBridge();
  const bridge = getPlatformBridge();
  const { config } = bridge;

  installApiBaseInterceptor(config);

  const root = document.documentElement;
  root.dataset.platform = config.os;
  root.dataset.shell = config.kind;
  if (profileUrl) {
    root.dataset.server = profileUrl;
  }

  if (config.kind === "desktop" && bridge.desktop) {
    root.dataset.electron = "true";
    root.classList.add("arco-electron");
    document.body.classList.add("arco-electron");
  }

  if (config.kind === "mobile") {
    root.classList.add("arco-mobile-native");
    document.body.classList.add("arco-mobile-native");
    if (needsProfile && !hasActiveServerProfile()) {
      root.classList.add("arco-mobile-needs-server");
    }
  }
}
