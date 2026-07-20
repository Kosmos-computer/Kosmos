/**
 * Cloud thin-client mode — reuses server profiles + bearer sessions
 * (same pattern as bundled mobile shells). Applies to desktop, web/vite,
 * and mobile when an active profile has kind "cloud".
 */
import { getActiveServerProfile } from "./serverProfileStore";
import { isMobileBundledShell, mobileShellNeedsServerProfile } from "./mobileShellMode";

export function desktopUsesCloudProfile(): boolean {
  if (typeof window === "undefined") return false;
  return getActiveServerProfile()?.kind === "cloud";
}

/** Route API calls to a saved remote server profile (mobile or cloud connect). */
export function shellUsesRemoteApiBase(): boolean {
  if (mobileShellNeedsServerProfile()) return true;
  return desktopUsesCloudProfile();
}

/** Persist bearer tokens per remote server (cross-origin desktop/mobile/web clients). */
export function usesRemoteSessionStore(): boolean {
  if (isMobileBundledShell()) return true;
  return desktopUsesCloudProfile();
}
