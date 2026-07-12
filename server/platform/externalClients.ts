/**
 * External client tokens — scoped credentials for the outward MCP endpoint
 * (POST /mcp). A dedicated token type, deliberately not a user session:
 * sessions authenticate a person at the shell; these authenticate a program
 * at a protocol edge, with their own scope and revocation.
 *
 * Joplin posture throughout: the master switch defaults off, and new tokens
 * default to read-only — write intents are an explicit opt-in per client.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ExternalAccessInfo, ExternalClientScope } from "../../shared/types.js";
import { dataDirs } from "../env.js";
import { writeSecureJson } from "../security/secureFs.js";

const FILE = path.join(dataDirs.root, "external-clients.json");

interface ExternalClient {
  id: string;
  name: string;
  /** The bearer secret. Stored plain at prototype scale (settings.json
   *  precedent); returned in full exactly once, at mint. */
  token: string;
  scope: ExternalClientScope;
  enabled: boolean;
  createdAt: string;
}

interface State {
  enabled: boolean;
  clients: ExternalClient[];
}

function load(): State {
  try {
    return { enabled: false, clients: [], ...JSON.parse(fs.readFileSync(FILE, "utf-8")) };
  } catch {
    return { enabled: false, clients: [] };
  }
}

function save(state: State): void {
  writeSecureJson(FILE, state);
}

export const externalClients = {
  info(): ExternalAccessInfo {
    const state = load();
    return {
      enabled: state.enabled,
      clients: state.clients.map(({ token, ...c }) => ({ ...c, tokenPreview: token.slice(-4) })),
    };
  },

  setEnabled(enabled: boolean): void {
    const state = load();
    state.enabled = enabled;
    save(state);
  },

  /** Mint a client; the returned token is shown once and never again. */
  mint(name: string, scope: ExternalClientScope): { id: string; token: string } {
    const state = load();
    const client: ExternalClient = {
      id: crypto.randomUUID().slice(0, 8),
      name,
      token: crypto.randomBytes(32).toString("base64url"),
      scope,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    state.clients.push(client);
    save(state);
    return { id: client.id, token: client.token };
  },

  update(id: string, patch: { enabled?: boolean; scope?: ExternalClientScope }): boolean {
    const state = load();
    const client = state.clients.find((c) => c.id === id);
    if (!client) return false;
    if (patch.enabled !== undefined) client.enabled = patch.enabled;
    if (patch.scope !== undefined) client.scope = patch.scope;
    save(state);
    return true;
  },

  revoke(id: string): void {
    const state = load();
    state.clients = state.clients.filter((c) => c.id !== id);
    save(state);
  },

  /** Resolve a bearer token → active client, honoring the master switch. */
  authenticate(token: string): { id: string; name: string; scope: ExternalClientScope } | null {
    const state = load();
    if (!state.enabled || !token) return null;
    const client = state.clients.find((c) => c.enabled && c.token === token);
    return client ? { id: client.id, name: client.name, scope: client.scope } : null;
  },
};
