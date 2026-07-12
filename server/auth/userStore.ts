/**
 * User accounts — JSON persistence (data/users.json) with scrypt password
 * hashing from node:crypto (no external dependency, memory-hard, and the
 * parameters travel inside each hash string so they can be raised later
 * without invalidating existing accounts).
 *
 * Invariant: the first account created is always the owner (via first-run
 * setup); the last remaining owner can never be deleted or demoted, so the
 * instance can't lock itself out of user management.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ROLE_CAPABILITIES, type AuthUser, type Role, type UserSummary } from "../../shared/types.js";
import { dataDirs } from "../env.js";
import { writeSecureJson } from "../security/secureFs.js";

const USERS_FILE = path.join(dataDirs.root, "users.json");

/** Stored shape — passwordHash never crosses the API boundary. */
interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  /** Format: scrypt$N$r$p$saltHex$hashHex — self-describing for upgrades. */
  passwordHash: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Password hashing
//
// scrypt with N=2^15 keeps interactive logins under ~100ms while remaining
// expensive for offline cracking. Verification is timing-safe and re-derives
// with the parameters embedded in the stored string.
// ---------------------------------------------------------------------------

/** On small VPS instances (e.g. 2GB RAM + full swap), N=2^15 can OOM-kill the process during setup. */
const LOW_MEMORY = process.env.ARCO_LOW_MEMORY === "1";
const SCRYPT = LOW_MEMORY
  ? { N: 2 ** 14, r: 8, p: 1, keyLen: 64 }
  : { N: 2 ** 15, r: 8, p: 1, keyLen: 64 };

/** Node caps scrypt at 32MB by default; N=2^15, r=8 needs 128·N·r = exactly 32MB. */
const SCRYPT_MAXMEM = LOW_MEMORY ? 32 * 1024 * 1024 : 64 * 1024 * 1024;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keyLen, { ...SCRYPT, maxmem: SCRYPT_MAXMEM });
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, n, r, p, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt") return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: SCRYPT_MAXMEM,
  });
  return crypto.timingSafeEqual(actual, expected);
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function load(): UserRecord[] {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8")) as UserRecord[];
  } catch {
    return [];
  }
}

function save(users: UserRecord[]): void {
  // Owner-only readable: the file holds password hashes.
  writeSecureJson(USERS_FILE, users);
}

/** Strip secrets and expand the role into concrete capabilities. */
function toAuthUser(u: UserRecord): AuthUser {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    capabilities: ROLE_CAPABILITIES[u.role],
  };
}

export const userStore = {
  /** True until first-run setup creates the owner account. */
  isEmpty(): boolean {
    return load().length === 0;
  },

  list(): UserSummary[] {
    return load().map(({ id, username, displayName, role, createdAt }) => ({
      id,
      username,
      displayName,
      role,
      createdAt,
    }));
  },

  getAuthUser(id: string): AuthUser | null {
    const record = load().find((u) => u.id === id);
    return record ? toAuthUser(record) : null;
  },

  /** Password check by username; null on unknown user or bad password. */
  authenticate(username: string, password: string): AuthUser | null {
    const record = load().find((u) => u.username === username.toLowerCase());
    if (!record || !verifyPassword(password, record.passwordHash)) return null;
    return toAuthUser(record);
  },

  /** Re-verify a known user's password (unlock flow). */
  verify(id: string, password: string): boolean {
    const record = load().find((u) => u.id === id);
    return record ? verifyPassword(password, record.passwordHash) : false;
  },

  create(input: { username: string; displayName?: string; password: string; role: Role }): AuthUser {
    const username = input.username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,32}$/.test(username)) {
      throw new Error("Username must be 2–32 chars: letters, digits, dots, dashes, underscores");
    }
    if (input.password.length < 8) throw new Error("Password must be at least 8 characters");
    const users = load();
    if (users.some((u) => u.username === username)) throw new Error("Username already taken");

    const record: UserRecord = {
      id: crypto.randomUUID(),
      username,
      displayName: input.displayName?.trim() || username,
      role: input.role,
      passwordHash: hashPassword(input.password),
      createdAt: new Date().toISOString(),
    };
    users.push(record);
    save(users);
    return toAuthUser(record);
  },

  /** Refuses to delete the last owner — someone must retain user management. */
  delete(id: string): void {
    const users = load();
    const target = users.find((u) => u.id === id);
    if (!target) return;
    if (target.role === "owner" && users.filter((u) => u.role === "owner").length === 1) {
      throw new Error("Cannot delete the last owner account");
    }
    save(users.filter((u) => u.id !== id));
  },

  /** Role change with the same last-owner guard as delete. */
  setRole(id: string, role: Role): AuthUser {
    const users = load();
    const target = users.find((u) => u.id === id);
    if (!target) throw new Error("User not found");
    if (target.role === "owner" && role !== "owner" && users.filter((u) => u.role === "owner").length === 1) {
      throw new Error("Cannot demote the last owner account");
    }
    target.role = role;
    save(users);
    return toAuthUser(target);
  },

  setPassword(id: string, password: string): void {
    if (password.length < 8) throw new Error("Password must be at least 8 characters");
    const users = load();
    const target = users.find((u) => u.id === id);
    if (!target) throw new Error("User not found");
    target.passwordHash = hashPassword(password);
    save(users);
  },
};
