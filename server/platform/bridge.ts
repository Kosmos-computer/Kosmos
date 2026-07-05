/**
 * The bridge — the single choke point for privileged app calls.
 *
 * Identity: the shell mints a token per app window at launch
 * (POST /api/installed-apps/:id/token) and attaches it (x-app-token) to every
 * forwarded call; the app never claims its own identity. Grants are checked
 * here, the audit log is written here, and nothing dispatches around this
 * function.
 */
import crypto from "node:crypto";
import { intentMeta } from "../../shared/capabilities/index.js";
import { describePermissionKey } from "../../shared/manifest.js";
import { dbExecute, dbQuery } from "../stores/db.js";
import { invokeIntent } from "../capabilities/registry.js";
import { appendAudit, grantStore } from "./grantStore.js";
import { installedAppStore } from "./installedAppStore.js";

// ── Window tokens ─────────────────────────────────────────────────────────────

const tokens = new Map<string, { appId: string; mintedAt: number }>();
/** Tokens outlive any reasonable window session but not the process. */
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

export function mintToken(appId: string): string {
  // Opportunistic sweep — the map stays small (one entry per open window).
  const cutoff = Date.now() - TOKEN_TTL_MS;
  for (const [t, meta] of tokens) if (meta.mintedAt < cutoff) tokens.delete(t);

  const token = crypto.randomBytes(24).toString("base64url");
  tokens.set(token, { appId, mintedAt: Date.now() });
  return token;
}

export function resolveToken(token: string): string | undefined {
  const meta = tokens.get(token);
  if (!meta || meta.mintedAt < Date.now() - TOKEN_TTL_MS) return undefined;
  return meta.appId;
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

/** Per-app private SQLite namespace, e.g. "app_core-calendar". */
function storageNamespace(appId: string): string {
  return `app_${appId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export class BridgeError extends Error {}

/**
 * Execute one bridge call on behalf of an app. Throws BridgeError with a
 * user-meaningful message when the call is malformed or not permitted.
 */
export async function dispatchAppBridge(
  appId: string,
  method: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const app = installedAppStore.get(appId);
  if (!app || !app.enabled) {
    throw new BridgeError(`App ${appId} is not installed or is disabled`);
  }

  switch (method) {
    case "intent.invoke": {
      const intentId = String(params.intent ?? "");
      if (!intentMeta(intentId)) throw new BridgeError(`Unknown intent: ${intentId}`);
      const check = grantStore.checkIntent(appId, intentId);
      appendAudit({
        caller: { kind: "app", appId },
        method: `intent.invoke:${intentId}`,
        allowed: check.allowed,
      });
      if (!check.allowed) {
        throw new BridgeError(
          `Permission denied: "${describePermissionKey(check.key)}" is ${check.state} for ${app.manifest.name}. Manage grants in Settings → Apps.`,
        );
      }
      return invokeIntent(intentId, (params.params as Record<string, unknown>) ?? {});
    }

    case "storage.query":
    case "storage.execute": {
      const check = grantStore.checkAny(appId, ["storage:own"]);
      appendAudit({ caller: { kind: "app", appId }, method, allowed: check.allowed });
      if (!check.allowed) {
        throw new BridgeError(
          `Permission denied: "${describePermissionKey("storage:own")}" is ${check.state} for ${app.manifest.name}.`,
        );
      }
      const sql = String(params.sql ?? "");
      const bind = params.params as Record<string, unknown> | undefined;
      const ns = storageNamespace(appId);
      if (method === "storage.query") return dbQuery(sql, bind, ns);
      const result = dbExecute(sql, bind, ns);
      return { ...result, lastInsertRowid: Number(result.lastInsertRowid) };
    }

    default:
      throw new BridgeError(`Unknown bridge method: ${method}`);
  }
}
