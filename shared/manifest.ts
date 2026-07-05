/**
 * App platform types — the manifest is the unit of installation,
 * permissioning, and review for every app tier (declarative or code).
 *
 * Design rules:
 * - The tier determines the execution container, never the integration
 *   surface. Every app carries the same manifest shape and flows through the
 *   same bridge — see docs/app-platform-plan.md.
 * - Everything in this file crosses the platform boundary (manifests, wire
 *   protocol, grant keys), so names here are brand-free: contracts are
 *   "os.*", core app ids are "core.*", and no product name appears in
 *   headers, markers, or keys. Shell internals may stay branded; this file
 *   may not.
 */

// ── Manifest ─────────────────────────────────────────────────────────────────

export type AppTier = "declarative" | "code";

/** Where the app's UI comes from. */
export type AppEntry =
  /** A remote (or dev-server) URL, embedded in a sandboxed iframe. */
  | { kind: "url"; url: string }
  /** A static bundle under ./apps/<path>/ served at /apps/<path>/. */
  | { kind: "bundle"; path: string }
  /** A declarative OpenUI app (StoredApp id) rendered by the shell. */
  | { kind: "openui"; appId: string };

export type ShellFeature = "notify" | "windows" | "clipboard";

/**
 * A permission the app requests at install time. Grants are keyed per
 * permission (see permissionKeys) so users can revoke individually.
 */
export type PermissionRequest =
  /** One specific action intent, e.g. "calendar.event.create". */
  | { kind: "intent"; id: string }
  /** All intents of a contract at a given access level. */
  | { kind: "contract"; id: string; access: "read" | "write" }
  /** Namespaced SQLite storage. "own" = the app's private namespace. */
  | { kind: "storage"; scope: "own" }
  /** Client-side shell affordances, checked in the AppHost. */
  | { kind: "shell"; features: ShellFeature[] };

export interface AppManifest {
  /** Reverse-DNS identity. Core apps use "core.*", e.g. "core.calendar". */
  id: string;
  name: string;
  /** Semver. */
  version: string;
  description?: string;
  /** Lucide icon name (kebab-case), e.g. "calendar-days". */
  icon?: string;
  tier: AppTier;
  entry: AppEntry;
  /** Capability contracts this app provides, e.g. ["os.calendar@1"]. */
  implements?: string[];
  /** Capabilities this app consumes. */
  permissions: PermissionRequest[];
}

// ── Installation & grants ────────────────────────────────────────────────────

export type AppSource = "seed" | "url" | "manifest";

export interface InstalledApp {
  manifest: AppManifest;
  source: AppSource;
  enabled: boolean;
  installedAt: string;
}

export type GrantState = "granted" | "denied" | "ask";

/** Listing shape the shell consumes — installation plus resolved grants. */
export interface InstalledAppInfo extends InstalledApp {
  grants: Record<string, GrantState>;
}

/**
 * Expand a permission request into its grant keys. Grants are stored and
 * checked by key; a shell request with three features yields three keys so
 * each can be revoked independently.
 */
export function permissionKeys(p: PermissionRequest): string[] {
  switch (p.kind) {
    case "intent":
      return [`intent:${p.id}`];
    case "contract":
      return [`contract:${p.id}:${p.access}`];
    case "storage":
      return [`storage:${p.scope}`];
    case "shell":
      return p.features.map((f) => `shell:${f}`);
  }
}

/** Plain-language rendering for consent UI and the Settings grants panel. */
export function describePermissionKey(key: string): string {
  const [kind, ...rest] = key.split(":");
  const detail = rest.join(":");
  switch (kind) {
    case "intent":
      return `Perform action: ${detail}`;
    case "contract": {
      const [contract, access] = [rest.slice(0, -1).join(":"), rest[rest.length - 1]];
      return `${access === "write" ? "Read and modify" : "Read"} ${contract} data`;
    }
    case "storage":
      return detail === "own" ? "Store its own data" : `Access shared storage: ${detail}`;
    case "shell":
      return detail === "notify"
        ? "Show notifications"
        : detail === "windows"
          ? "Open and manage windows"
          : `Use shell feature: ${detail}`;
    default:
      return key;
  }
}

// ── Bridge protocol ──────────────────────────────────────────────────────────
//
// Apps talk to the OS through one typed RPC channel: postMessage to the
// AppHost, which forwards server-bound calls to POST /api/bridge with the
// window's token (header: x-app-token). The app never claims its own
// identity.

export type BridgeMethod = "intent.invoke" | "storage.query" | "storage.execute";

export interface BridgeRequest {
  method: BridgeMethod;
  params: Record<string, unknown>;
}

export interface BridgeResponse {
  result?: unknown;
  error?: string;
}

/** postMessage envelope, app ↔ host. All messages carry `appBridge: true`. */
export type AppHostMessage =
  /** App → host: SDK boot complete; host replies with a theme push. */
  | { appBridge: true; type: "ready" }
  /** App → host: RPC request (server bridge methods or shell.* client calls). */
  | {
      appBridge: true;
      type: "request";
      id: number;
      method: string;
      params: Record<string, unknown>;
    }
  /** Host → app: RPC response. */
  | { appBridge: true; type: "response"; id: number; ok: boolean; result?: unknown; error?: string }
  /** Host → app: theme tokens (on ready and on every theme change). */
  | { appBridge: true; type: "theme"; theme: string; tokens: Record<string, string> };
