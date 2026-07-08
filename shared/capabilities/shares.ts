/**
 * os.shares@1 — scoped external sharing over os.files@1.
 *
 * Shares are first-class records with opaque tokens. Public recipients never
 * receive session auth, bridge access, or internal file ids in URLs.
 */
import { FILES_CHANGED_TOPIC } from "./files.js";

export const SHARES_CONTRACT_ID = "os.shares@1";

/** How much an anonymous token holder may do. */
export type ShareMode = "download" | "view";

export interface ShareRecord {
  id: string;
  /** Public identifier — appears in /s/:token URLs only. */
  token: string;
  fileId: string;
  createdBy: string;
  mode: ShareMode;
  allowDownload: boolean;
  expiresAt: string | null;
  label: string | null;
  revokedAt: string | null;
  createdAt: string;
  accessCount: number;
  lastAccessAt: string | null;
  /** True when a password is required (hash never exposed). */
  hasPassword: boolean;
}

export interface ShareCreateInput {
  fileId: string;
  mode?: ShareMode;
  allowDownload?: boolean;
  password?: string;
  expiresAt?: string | null;
  label?: string | null;
}

export const SHARES_INTENTS = {
  "shares.create": "write",
  "shares.list": "read",
  "shares.revoke": "write",
  "shares.update": "write",
} as const;

export type SharesIntentId = keyof typeof SHARES_INTENTS;

export const SHARES_INTENT_SCHEMAS: Record<string, Record<string, unknown>> = {
  "shares.create": {
    type: "object",
    required: ["fileId"],
    properties: {
      fileId: { type: "string", description: "Drive file or folder id to share" },
      mode: { type: "string", enum: ["download", "view"], default: "download" },
      allowDownload: { type: "boolean", default: true },
      password: { type: "string", description: "Optional link password" },
      expiresAt: { type: ["string", "null"], description: "ISO date or YYYY-MM-DD" },
      label: { type: "string" },
    },
  },
  "shares.list": {
    type: "object",
    properties: {
      fileId: { type: "string", description: "Filter to shares for one file" },
    },
  },
  "shares.revoke": {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", description: "Internal share id" } },
  },
  "shares.update": {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
      mode: { type: "string", enum: ["download", "view"] },
      allowDownload: { type: "boolean" },
      password: { type: "string", description: "Set or change password; empty string clears" },
      expiresAt: { type: ["string", "null"] },
      label: { type: "string" },
    },
  },
};

/** Announced when share links are created, updated, or revoked. */
export const SHARES_CHANGED_TOPIC = "shares.changed";

export { FILES_CHANGED_TOPIC };
