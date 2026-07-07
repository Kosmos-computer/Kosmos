/**
 * Auth middleware — cookie → session → user resolution, plus the capability
 * guard used by every protected route.
 *
 * Two failure modes reach the client as 401 JSON with a `code` field so the
 * shell can route to the right screen: "unauthenticated" (show login) and
 * "locked" (show the lock screen; the session itself is still valid).
 */
import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import type { AuthUser, Capability } from "../../shared/types.js";
import { authSessionStore } from "./sessionStore.js";
import { userStore } from "./userStore.js";

export const AUTH_COOKIE = "arco_session";

/** Hono env carrying the resolved user through the request. */
export type AuthEnv = {
  Variables: {
    user: AuthUser;
    sessionToken: string;
  };
};

/**
 * Gate everything under /api except the auth endpoints themselves.
 * Static assets stay public — the shell must load to show the login screen.
 */
export const requireAuth: MiddlewareHandler<AuthEnv> = async (c, next) => {
  if (c.req.path.startsWith("/api/auth/")) return next();
  // OAuth provider callbacks arrive without a session cookie — state carries user binding.
  if (c.req.path === "/api/mail/oauth/google/callback") return next();
  if (!c.req.path.startsWith("/api/")) return next();

  const token =
    getCookie(c, AUTH_COOKIE) ??
    (() => {
      const auth = c.req.header("authorization") ?? "";
      const match = auth.match(/^Bearer\s+(.+)$/i);
      return match?.[1]?.trim() || undefined;
    })();
  const session = token ? authSessionStore.get(token) : null;
  const user = session ? userStore.getAuthUser(session.userId) : null;
  if (!session || !user) {
    return c.json({ error: "Authentication required", code: "unauthenticated" }, 401);
  }
  if (session.locked) {
    return c.json({ error: "Session is locked", code: "locked" }, 401);
  }
  c.set("user", user);
  c.set("sessionToken", token!);
  return next();
};

/** Per-route capability check — layered after requireAuth. */
export function requireCap(cap: Capability): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    const user = c.get("user");
    if (!user?.capabilities.includes(cap)) {
      return c.json({ error: `Missing permission: ${cap}`, code: "forbidden" }, 403);
    }
    return next();
  };
}

/** Convenience for handlers that need the caller's identity. */
export function currentUser(c: Context<AuthEnv>): AuthUser {
  return c.get("user");
}
