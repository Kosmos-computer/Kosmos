/**
 * Auth routes — mounted at /api/auth (the only unauthenticated API surface).
 *
 *   GET  /status          — boot snapshot: needsSetup / authenticated / locked
 *   POST /setup           — first-run: create the owner account + sign in
 *   POST /login           — password login (rate-limited per username)
 *   POST /logout          — revoke the session + clear the cookie
 *   POST /lock            — lock the current session (auth required)
 *   POST /unlock          — re-verify password, clear the lock
 *   GET  /users           — list accounts            [users:manage]
 *   POST /users           — create an account        [users:manage]
 *   PATCH /users/:id      — change role or password  [users:manage]
 *   DELETE /users/:id     — remove an account        [users:manage]
 */
import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { AuthStatus, Role } from "../../shared/types.js";
import { AUTH_COOKIE, type AuthEnv } from "./middleware.js";
import { authSessionStore } from "./sessionStore.js";
import { userStore } from "./userStore.js";

// ---------------------------------------------------------------------------
// Login rate limiting
//
// In-memory per-username throttle: 5 failures opens a 15-minute lockout.
// Memory-only is fine here — a restart clearing counters is acceptable, and
// scrypt already makes each attempt expensive.
// ---------------------------------------------------------------------------

const attempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function isThrottled(username: string): boolean {
  const entry = attempts.get(username);
  return !!entry && entry.blockedUntil > Date.now();
}

function recordFailure(username: string): void {
  const entry = attempts.get(username) ?? { count: 0, blockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_FAILURES) {
    entry.blockedUntil = Date.now() + LOCKOUT_MS;
    entry.count = 0;
  }
  attempts.set(username, entry);
}

// ---------------------------------------------------------------------------
// Cookie policy
//
// HttpOnly + SameSite=Lax blocks script access and cross-site POSTs. `secure`
// flips on behind HTTPS (ARCO_SECURE_COOKIES=1) — required before hosting
// this beyond localhost.
// ---------------------------------------------------------------------------

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "Lax" as const,
  secure: process.env.ARCO_SECURE_COOKIES === "1",
  path: "/",
  maxAge: 30 * 24 * 60 * 60,
};

export const authRoutes = new Hono<AuthEnv>();

/** Resolve the caller's session directly — these routes run before requireAuth populates context. */
function resolveSession(c: Context<AuthEnv>) {
  const token = getCookie(c, AUTH_COOKIE);
  const session = token ? authSessionStore.get(token) : null;
  return { token, session, user: session ? userStore.getAuthUser(session.userId) : null };
}

authRoutes.get("/status", (c) => {
  const { session, user } = resolveSession(c);
  // `user` rides along even while locked — the lock screen greets by name,
  // matching OS lock-screen conventions (identity is shown, access is not).
  const status: AuthStatus = {
    needsSetup: userStore.isEmpty(),
    authenticated: !!user,
    locked: !!session?.locked,
    ...(user ? { user } : {}),
  };
  return c.json(status);
});

authRoutes.post("/setup", async (c) => {
  // Only valid while zero accounts exist — afterwards owners add users.
  if (!userStore.isEmpty()) return c.json({ error: "Setup already completed" }, 403);
  const body = (await c.req.json()) as { username: string; displayName?: string; password: string };
  try {
    const user = userStore.create({ ...body, role: "owner" });
    setCookie(c, AUTH_COOKIE, authSessionStore.create(user.id), COOKIE_OPTS);
    return c.json({ user });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Setup failed" }, 400);
  }
});

authRoutes.post("/login", async (c) => {
  const body = (await c.req.json()) as { username: string; password: string };
  const username = (body.username ?? "").trim().toLowerCase();
  if (isThrottled(username)) {
    return c.json({ error: "Too many failed attempts — try again in a few minutes" }, 429);
  }
  const user = userStore.authenticate(username, body.password ?? "");
  if (!user) {
    recordFailure(username);
    // Deliberately vague: don't reveal whether the username exists.
    return c.json({ error: "Invalid username or password" }, 401);
  }
  attempts.delete(username);
  setCookie(c, AUTH_COOKIE, authSessionStore.create(user.id), COOKIE_OPTS);
  return c.json({ user });
});

authRoutes.post("/logout", (c) => {
  const { token } = resolveSession(c);
  if (token) authSessionStore.revoke(token);
  deleteCookie(c, AUTH_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

authRoutes.post("/lock", (c) => {
  const { token, session } = resolveSession(c);
  if (!token || !session) return c.json({ error: "Not signed in" }, 401);
  authSessionStore.setLocked(token, true);
  return c.json({ ok: true });
});

authRoutes.post("/unlock", async (c) => {
  const { token, session, user } = resolveSession(c);
  if (!token || !session || !user) return c.json({ error: "Not signed in" }, 401);
  if (isThrottled(user.username)) {
    return c.json({ error: "Too many failed attempts — try again in a few minutes" }, 429);
  }
  const body = (await c.req.json()) as { password: string };
  if (!userStore.verify(user.id, body.password ?? "")) {
    recordFailure(user.username);
    return c.json({ error: "Incorrect password" }, 401);
  }
  attempts.delete(user.username);
  authSessionStore.setLocked(token, false);
  return c.json({ user });
});

/**
 * Self-service password change — any signed-in, unlocked user, gated on the
 * current password (a walked-away-unlocked machine can't silently rekey the
 * account). All existing sessions die with the old password; a fresh cookie
 * keeps this one signed in.
 */
authRoutes.post("/password", async (c) => {
  const { session, user } = resolveSession(c);
  if (!session || session.locked || !user) return c.json({ error: "Not signed in" }, 401);
  const body = (await c.req.json()) as { currentPassword: string; newPassword: string };
  if (!userStore.verify(user.id, body.currentPassword ?? "")) {
    return c.json({ error: "Current password is incorrect" }, 401);
  }
  try {
    userStore.setPassword(user.id, body.newPassword ?? "");
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Update failed" }, 400);
  }
  authSessionStore.revokeAllForUser(user.id);
  setCookie(c, AUTH_COOKIE, authSessionStore.create(user.id), COOKIE_OPTS);
  return c.json({ ok: true });
});

// ---------------------------------------------------------------------------
// User management (owner/admin territory via users:manage)
//
// These sit under /api/auth/* which requireAuth skips, so each route carries
// its own session resolution + capability check.
// ---------------------------------------------------------------------------

const requireManage = (c: Context<AuthEnv>) => {
  const { session, user } = resolveSession(c);
  if (!session || session.locked || !user) return null;
  return user.capabilities.includes("users:manage") ? user : null;
};

authRoutes.get("/users", (c) => {
  if (!requireManage(c)) return c.json({ error: "Missing permission: users:manage" }, 403);
  return c.json(userStore.list());
});

authRoutes.post("/users", async (c) => {
  if (!requireManage(c)) return c.json({ error: "Missing permission: users:manage" }, 403);
  const body = (await c.req.json()) as {
    username: string;
    displayName?: string;
    password: string;
    role: Role;
  };
  try {
    return c.json(userStore.create(body));
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Create failed" }, 400);
  }
});

authRoutes.patch("/users/:id", async (c) => {
  if (!requireManage(c)) return c.json({ error: "Missing permission: users:manage" }, 403);
  const body = (await c.req.json()) as { role?: Role; password?: string };
  try {
    const id = c.req.param("id");
    if (body.role) userStore.setRole(id, body.role);
    if (body.password) {
      userStore.setPassword(id, body.password);
      authSessionStore.revokeAllForUser(id); // stolen sessions die with the old password
    }
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Update failed" }, 400);
  }
});

authRoutes.delete("/users/:id", (c) => {
  if (!requireManage(c)) return c.json({ error: "Missing permission: users:manage" }, 403);
  try {
    const id = c.req.param("id");
    userStore.delete(id);
    authSessionStore.revokeAllForUser(id);
    return c.json({ ok: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Delete failed" }, 400);
  }
});
