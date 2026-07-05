/**
 * Grant store + audit log — the permission state the bridge checks on every
 * call, and the user-visible record of what actually happened.
 *
 * Grants are keyed `(appId, permissionKey)` where permissionKey comes from
 * permissionKeys() in shared/manifest.ts. This is deliberately parallel to —
 * not merged with — the user-level Capability system in shared/types.ts:
 * user capabilities answer "may this person do X", app grants answer "may
 * this app do X on their behalf".
 */
import fs from "node:fs";
import path from "node:path";
import type { AppManifest, GrantState } from "../../shared/manifest.js";
import { permissionKeys } from "../../shared/manifest.js";
import { intentMeta } from "../../shared/capabilities/index.js";
import { dataDirs } from "../env.js";

const FILE = path.join(dataDirs.root, "app-grants.json");
const AUDIT_FILE = path.join(dataDirs.root, "audit.jsonl");

type GrantMap = Record<string, Record<string, GrantState>>;

function load(): GrantMap {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as GrantMap;
  } catch {
    return {};
  }
}

function save(grants: GrantMap): void {
  fs.writeFileSync(FILE, JSON.stringify(grants, null, 2), "utf-8");
}

export interface PermissionCheck {
  allowed: boolean;
  /** The grant key that decided the outcome (for audit + error messages). */
  key: string;
  state: GrantState | "unrequested";
}

export const grantStore = {
  grants(appId: string): Record<string, GrantState> {
    return load()[appId] ?? {};
  },

  set(appId: string, key: string, state: GrantState): void {
    const grants = load();
    grants[appId] = { ...grants[appId], [key]: state };
    save(grants);
  },

  /** Grant every permission a manifest requests (install-time default). */
  grantManifest(manifest: AppManifest): void {
    const grants = load();
    const app = { ...grants[manifest.id] };
    for (const perm of manifest.permissions) {
      for (const key of permissionKeys(perm)) {
        // Don't overwrite an explicit user denial on upgrade.
        if (app[key] !== "denied") app[key] = "granted";
      }
    }
    grants[manifest.id] = app;
    save(grants);
  },

  clear(appId: string): void {
    const grants = load();
    delete grants[appId];
    save(grants);
  },

  /**
   * May this app perform the given intent? Satisfied by an intent-specific
   * grant OR a contract-level grant at sufficient access.
   */
  checkIntent(appId: string, intentId: string): PermissionCheck {
    const meta = intentMeta(intentId);
    const keys = [`intent:${intentId}`];
    if (meta) keys.push(`contract:${meta.contractId}:${meta.access}`);
    return this.checkAny(appId, keys);
  },

  /** May this app use any of these grant keys? First granted key wins. */
  checkAny(appId: string, keys: string[]): PermissionCheck {
    const app = load()[appId] ?? {};
    for (const key of keys) {
      if (app[key] === "granted") return { allowed: true, key, state: "granted" };
    }
    // Not granted — report the key the user actually decided on (an explicit
    // "denied"/"ask") over one that was simply never requested.
    const decided = keys.find((key) => app[key] !== undefined);
    const key = decided ?? keys[0];
    return { allowed: false, key, state: decided ? app[decided] : "unrequested" };
  },
};

// ── Audit log ─────────────────────────────────────────────────────────────────
//
// Append-only JSONL: one line per privileged call, app and agent alike. This
// is the "why did you move my meeting?" answerability layer — cheap now,
// queryable later.

export interface AuditEntry {
  ts: string;
  caller: { kind: "app"; appId: string } | { kind: "agent"; sessionId: string };
  method: string;
  detail?: string;
  allowed: boolean;
}

export function appendAudit(entry: Omit<AuditEntry, "ts">): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  try {
    fs.appendFileSync(AUDIT_FILE, line + "\n", "utf-8");
  } catch {
    // Audit failures must never block the call itself.
  }
}
