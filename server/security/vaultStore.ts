/**
 * Secrets vault store — sealed items in data/secrets.vault.json (0o600).
 *
 * Callers outside this module should prefer metadata APIs; use getPlaintext
 * only at the moment of use (LLM client, OAuth refresh, MCP spawn).
 *
 * Resolves the data dir locally (same rules as env.ts) so env.ts can import
 * this module without a circular dependency.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { writeSecureJson } from "./secureFs.js";
import {
  sealSecret,
  secretLast4,
  unsealSecret,
  type SealedSecret,
} from "./vaultCrypto.js";

function dataRoot(): string {
  return process.env.ARCO_DATA_DIR
    ? path.resolve(process.env.ARCO_DATA_DIR)
    : path.resolve(process.cwd(), "data");
}

function vaultPath(): string {
  return path.join(dataRoot(), "secrets.vault.json");
}

export type VaultScope = "llm" | "mcp" | "channel" | "oauth" | "external" | "webhook" | "other";

export interface VaultSecretMeta {
  id: string;
  name: string;
  scope: VaultScope;
  envName?: string;
  last4: string;
  keyId: string;
  createdAt: string;
  updatedAt: string;
}

interface VaultSecretRecord extends VaultSecretMeta {
  sealed: SealedSecret;
}

interface VaultFile {
  version: 1;
  secrets: VaultSecretRecord[];
}

const EMPTY: VaultFile = { version: 1, secrets: [] };

function load(): VaultFile {
  try {
    const raw = JSON.parse(fs.readFileSync(vaultPath(), "utf-8")) as Partial<VaultFile>;
    return { version: 1, secrets: raw.secrets ?? [] };
  } catch {
    return { ...EMPTY, secrets: [] };
  }
}

function save(file: VaultFile): void {
  writeSecureJson(vaultPath(), file);
}

function toMeta(record: VaultSecretRecord): VaultSecretMeta {
  const { sealed: _s, ...meta } = record;
  return meta;
}

export const vaultStore = {
  list(scope?: VaultScope): VaultSecretMeta[] {
    const secrets = load().secrets;
    return (scope ? secrets.filter((s) => s.scope === scope) : secrets).map(toMeta);
  },

  getMeta(id: string): VaultSecretMeta | null {
    const record = load().secrets.find((s) => s.id === id);
    return record ? toMeta(record) : null;
  },

  /** Decrypt for in-process use only — never send to the client. */
  getPlaintext(id: string): string | null {
    const record = load().secrets.find((s) => s.id === id);
    if (!record) return null;
    return unsealSecret(record.sealed);
  },

  /**
   * Create or replace a secret. Returns metadata only.
   * Stable ids (e.g. `settings/llm-api-key`) make migration deterministic.
   */
  put(input: {
    id?: string;
    name: string;
    scope: VaultScope;
    plaintext: string;
    envName?: string;
  }): VaultSecretMeta {
    const file = load();
    const now = new Date().toISOString();
    const id = input.id ?? `vault_${crypto.randomBytes(8).toString("hex")}`;
    const sealed = sealSecret(input.plaintext);
    const existing = file.secrets.find((s) => s.id === id);
    const record: VaultSecretRecord = {
      id,
      name: input.name,
      scope: input.scope,
      envName: input.envName,
      last4: secretLast4(input.plaintext),
      keyId: sealed.keyId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      sealed,
    };
    file.secrets = [...file.secrets.filter((s) => s.id !== id), record];
    save(file);
    return toMeta(record);
  },

  delete(id: string): boolean {
    const file = load();
    const next = file.secrets.filter((s) => s.id !== id);
    if (next.length === file.secrets.length) return false;
    file.secrets = next;
    save(file);
    return true;
  },
};

/** Well-known ids for settings migration. */
export const SETTINGS_VAULT_IDS = {
  apiKey: "settings/llm-api-key",
  cursorApiKey: "settings/cursor-api-key",
} as const;
