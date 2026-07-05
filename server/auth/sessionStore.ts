/**
 * Auth sessions — opaque bearer tokens delivered as an HttpOnly cookie.
 *
 * The raw token exists only in the client's cookie jar; the server persists
 * a SHA-256 digest (data/auth-sessions.json), so a leaked data dir doesn't
 * yield usable sessions. Sessions survive server restarts and expire on a
 * sliding 30-day window. Each session carries a `locked` flag: a locked
 * session stays valid but every non-auth API call is refused until the user
 * re-enters their password.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dataDirs } from "../env.js";

const SESSIONS_FILE = path.join(dataDirs.root, "auth-sessions.json");
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthSession {
  /** SHA-256 hex of the cookie token — never the token itself. */
  tokenHash: string;
  userId: string;
  locked: boolean;
  createdAt: number;
  expiresAt: number;
}

function load(): AuthSession[] {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8")) as AuthSession[];
  } catch {
    return [];
  }
}

function save(sessions: AuthSession[]): void {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions), { encoding: "utf-8", mode: 0o600 });
}

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export const authSessionStore = {
  /** Mint a session; returns the raw token for the Set-Cookie header. */
  create(userId: string): string {
    const token = crypto.randomBytes(32).toString("base64url");
    const now = Date.now();
    const sessions = load().filter((s) => s.expiresAt > now);
    sessions.push({ tokenHash: hashToken(token), userId, locked: false, createdAt: now, expiresAt: now + SESSION_TTL_MS });
    save(sessions);
    return token;
  },

  /** Look up a live session by raw token, sliding its expiry forward. */
  get(token: string): AuthSession | null {
    const tokenHash = hashToken(token);
    const now = Date.now();
    const sessions = load();
    const session = sessions.find((s) => s.tokenHash === tokenHash && s.expiresAt > now);
    if (!session) return null;
    // Slide expiry at most once a day to avoid a disk write per request.
    if (session.expiresAt - now < SESSION_TTL_MS - 24 * 60 * 60 * 1000) {
      session.expiresAt = now + SESSION_TTL_MS;
      save(sessions);
    }
    return session;
  },

  setLocked(token: string, locked: boolean): void {
    const tokenHash = hashToken(token);
    const sessions = load();
    const session = sessions.find((s) => s.tokenHash === tokenHash);
    if (!session) return;
    session.locked = locked;
    save(sessions);
  },

  revoke(token: string): void {
    save(load().filter((s) => s.tokenHash !== hashToken(token)));
  },

  /** Kill every session for a user (account deletion, password change). */
  revokeAllForUser(userId: string): void {
    save(load().filter((s) => s.userId !== userId));
  },
};
