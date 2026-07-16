/**
 * Auth store — the shell's screen router for the sign-in lifecycle.
 *
 * `phase` drives what AuthGate renders:
 *
 *   booting → (status fetch) → setup | login | locked | ready
 *
 * A "locked" session stays signed in server-side but every API call is
 * refused until unlock, so locking is instant and cheap. Any 401 from a
 * regular API call arrives here through the window "arco:auth-failure"
 * event and demotes the phase — no per-caller handling needed.
 */
import { create } from "zustand";
import type { AuthUser, Capability, Settings } from "@shared/types";
import { setBearerTokenInterceptor } from "@arco/platform-bridge";
import { api, type AuthFailureCode } from "../../lib/api";
import { getActiveServerUrl } from "../server/serverProfileStore";
import {
  clearMobileSessionToken,
  setMobileSessionToken,
} from "../server/mobileSessionStore";

export type AuthPhase = "booting" | "setup" | "login" | "locked" | "ready" | "offline";

interface AuthStore {
  phase: AuthPhase;
  user: AuthUser | null;
  /** Sign-in / unlock error surfaced on the auth screens. */
  error: string | null;

  /** Boot-time status fetch; resolves when the phase is known. */
  init: () => Promise<void>;
  setup: (data: {
    username: string;
    displayName?: string;
    password: string;
    settings?: Partial<Settings>;
  }) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

/** Extract the server's error message from the api helper's thrown string. */
function readableError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const match = raw.match(/\{.*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch {
      // fall through to the raw message
    }
  }
  return raw;
}

function isReachabilityError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return /failed to fetch|networkerror|load failed|cannot reach|connection refused|econnrefused/i.test(raw);
}

function persistMobileSession(token?: string): void {
  if (!token) return;
  const serverUrl = getActiveServerUrl();
  if (!serverUrl) return;
  setMobileSessionToken(serverUrl, token);
  setBearerTokenInterceptor(token);
}

function clearMobileSession(): void {
  clearMobileSessionToken();
  setBearerTokenInterceptor(null);
}

export const useAuthStore = create<AuthStore>((set) => ({
  phase: "booting",
  user: null,
  error: null,

  init: async () => {
    set({ phase: "booting", error: null });
    try {
      const status = await api.authStatus();
      if (status.needsSetup) set({ phase: "setup" });
      else if (status.locked) set({ phase: "locked" });
      else if (status.authenticated && status.user) set({ phase: "ready", user: status.user });
      else set({ phase: "login" });
    } catch {
      set({ phase: "offline", error: "Cannot reach the Kosmos server" });
    }
  },

  setup: async (data) => {
    try {
      const { user, sessionToken } = await api.authSetup(data);
      persistMobileSession(sessionToken);
      set({ phase: "ready", user, error: null });
    } catch (err) {
      if (isReachabilityError(err)) set({ phase: "offline", error: "Cannot reach the Kosmos server" });
      else set({ error: readableError(err) });
    }
  },

  login: async (username, password) => {
    try {
      const { user, sessionToken } = await api.authLogin(username, password);
      persistMobileSession(sessionToken);
      set({ phase: "ready", user, error: null });
    } catch (err) {
      if (isReachabilityError(err)) set({ phase: "offline", error: "Cannot reach the Kosmos server" });
      else set({ error: readableError(err) });
    }
  },

  unlock: async (password) => {
    try {
      const { user, sessionToken } = await api.authUnlock(password);
      persistMobileSession(sessionToken);
      set({ phase: "ready", user, error: null });
    } catch (err) {
      if (isReachabilityError(err)) set({ phase: "offline", error: "Cannot reach the Kosmos server" });
      else set({ error: readableError(err) });
    }
  },

  // Flip the UI immediately; the server call invalidates the session's API
  // access so other tabs/devices on the same cookie lock too.
  lock: async () => {
    set({ phase: "locked", error: null });
    await api.authLock().catch(() => {});
  },

  logout: async () => {
    await api.authLogout().catch(() => {});
    clearMobileSession();
    set({ phase: "login", user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));

/** Capability probe for UI gating — server-side guards remain authoritative. */
export function useCan(cap: Capability): boolean {
  return useAuthStore((s) => s.user?.capabilities.includes(cap) ?? false);
}

// A 401 anywhere in the app demotes the session: "locked" shows the lock
// screen (user still known), anything else falls back to login.
window.addEventListener("arco:auth-failure", (e) => {
  const code = (e as CustomEvent<AuthFailureCode>).detail;
  const { phase } = useAuthStore.getState();
  if (phase !== "ready") return;
  useAuthStore.setState(code === "locked" ? { phase: "locked" } : { phase: "login", user: null });
});
