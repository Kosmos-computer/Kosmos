/**
 * Bootstrap platform flags before the first React paint.
 * Mobile shells load apiBase from saved server profiles when bundled.
 */
import {
  getPlatformBridge,
  installApiBaseInterceptor,
  resolvePlatformBridge,
  setApiBaseInterceptor,
  setBearerTokenInterceptor,
} from "@arco/platform-bridge";
import { getActiveServerUrl, hasActiveServerProfile } from "./server/serverProfileStore";
import { getMobileSessionToken } from "./server/mobileSessionStore";
import { mobileShellNeedsServerProfile } from "./server/mobileShellMode";
import { desktopUsesCloudProfile, shellUsesRemoteApiBase } from "./server/cloudShellMode";

export async function bootstrapPlatformShell(): Promise<void> {
  const needsProfile = mobileShellNeedsServerProfile();
  const usesRemote = shellUsesRemoteApiBase();
  const profileUrl = usesRemote ? getActiveServerUrl() : null;

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
  // Ensure cloud/mobile profiles win even if the bridge was cached earlier.
  if (profileUrl) setApiBaseInterceptor(profileUrl);
  setBearerTokenInterceptor(getMobileSessionToken(profileUrl));

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

  if (config.kind === "desktop" && desktopUsesCloudProfile() && profileUrl) {
    root.classList.add("arco-desktop-cloud");
    root.dataset.cloud = profileUrl;
  }
}
