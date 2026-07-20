/** Local Arco contacts vault — always available in the backend switcher. */
export const LOCAL_CONTACTS_BACKEND_ID = "local";

/** Prefix for vaults keyed by a saved server profile (Kosmos Cloud / remote). */
export const SERVER_CONTACTS_BACKEND_PREFIX = "server:";

export function contactsBackendIdForServerProfile(profileId: string): string {
  return `${SERVER_CONTACTS_BACKEND_PREFIX}${profileId}`;
}

export function serverProfileIdFromContactsBackend(backendId: string): string | null {
  return backendId.startsWith(SERVER_CONTACTS_BACKEND_PREFIX)
    ? backendId.slice(SERVER_CONTACTS_BACKEND_PREFIX.length)
    : null;
}

export const DEFAULT_BACKEND_ID = LOCAL_CONTACTS_BACKEND_ID;
