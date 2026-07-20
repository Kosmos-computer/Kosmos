import { desktopUsesCloudProfile } from "../../os/server/cloudShellMode";
import { peekSessionTokenForServer } from "../../os/server/mobileSessionStore";
import {
  getActiveServerProfile,
  listServerProfiles,
} from "../../os/server/serverProfileStore";
import type { ServerProfile } from "../../os/server/serverProfileTypes";
import {
  LOCAL_NOTES_BACKEND_ID,
  notesBackendIdForServerProfile,
  serverProfileIdFromNotesBackend,
} from "./notesMock";

/** How to reach a Notes vault's Drive API. */
export interface NotesVaultEndpoint {
  /** Absolute server origin, or null to use relative `/api` (shell interceptor). */
  baseUrl: string | null;
  bearerToken: string | null;
  /**
   * When the shell is pointed at Kosmos Cloud, force requests to this page's
   * origin so Local vault hits the machine backend instead of the cloud interceptor.
   */
  forceLocalOrigin: boolean;
}

export function defaultNotesBackendId(): string {
  const active = getActiveServerProfile();
  if (active && (desktopUsesCloudProfile() || active.kind === "cloud")) {
    return notesBackendIdForServerProfile(active.id);
  }
  return LOCAL_NOTES_BACKEND_ID;
}

export function resolveServerProfile(backendId: string): ServerProfile | null {
  const profileId = serverProfileIdFromNotesBackend(backendId);
  if (!profileId) return null;
  return (
    listServerProfiles().find((profile) => profile.id === profileId) ??
    (getActiveServerProfile()?.id === profileId ? getActiveServerProfile() : null)
  );
}

export function resolveNotesVaultEndpoint(backendId: string): NotesVaultEndpoint {
  if (backendId === LOCAL_NOTES_BACKEND_ID) {
    // Cloud shell prefixes all relative /api calls — bypass with absolute local origin.
    if (desktopUsesCloudProfile()) {
      return { baseUrl: null, bearerToken: null, forceLocalOrigin: true };
    }
    return { baseUrl: null, bearerToken: null, forceLocalOrigin: false };
  }

  const profile = resolveServerProfile(backendId);
  if (!profile) {
    return { baseUrl: null, bearerToken: null, forceLocalOrigin: false };
  }

  const active = getActiveServerProfile();
  const shellOnThisProfile =
    desktopUsesCloudProfile() && active?.id === profile.id && active.url === profile.url;

  // Already talking to this host via the shell interceptor — use relative /api.
  if (shellOnThisProfile) {
    return { baseUrl: null, bearerToken: null, forceLocalOrigin: false };
  }

  return {
    baseUrl: profile.url.replace(/\/$/, ""),
    bearerToken: peekSessionTokenForServer(profile.url),
    forceLocalOrigin: false,
  };
}

export function notesBackendLabel(backendId: string): string {
  if (backendId === LOCAL_NOTES_BACKEND_ID) return "Local";
  const profile = resolveServerProfile(backendId);
  if (!profile) return "Backend";
  if (profile.kind === "cloud") return profile.name?.trim() || "Kosmos Cloud";
  return profile.name?.trim() || profile.url.replace(/^https?:\/\//, "");
}
