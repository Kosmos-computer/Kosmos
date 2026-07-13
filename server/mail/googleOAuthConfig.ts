/**
 * Google OAuth *app* credentials (Client ID / Secret).
 *
 * Resolution order: process env wins (cloud / ops), then Settings-stored
 * values in data/google-oauth.json + vault. User Gmail tokens stay in
 * mail-accounts.json — this file only identifies Kosmos to Google.
 */
import fs from "node:fs";
import path from "node:path";
import { dataDirs } from "../env.js";
import { writeSecureJson } from "../security/secureFs.js";
import { vaultStore } from "../security/vaultStore.js";

const CONFIG_FILE_NAME = "google-oauth.json";
export const GOOGLE_OAUTH_SECRET_VAULT_ID = "oauth/google-client-secret";

interface GoogleOAuthFile {
  clientId?: string;
}

export type GoogleOAuthSource = "env" | "settings";

export interface GoogleOAuthPublicStatus {
  configured: boolean;
  source: GoogleOAuthSource | null;
  /** True when Settings-stored credentials exist (even if env overrides). */
  settingsStored: boolean;
  /** True when env vars supply both id and secret. */
  envConfigured: boolean;
  clientIdHint: string | null;
  redirectUri: string;
}

function configPath(): string {
  return path.join(dataDirs.root, CONFIG_FILE_NAME);
}

function loadFile(): GoogleOAuthFile {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf-8")) as GoogleOAuthFile;
  } catch {
    return {};
  }
}

function saveFile(file: GoogleOAuthFile): void {
  writeSecureJson(configPath(), file);
}

function maskClientId(clientId: string): string {
  if (clientId.length <= 12) return "••••";
  return `${clientId.slice(0, 8)}…${clientId.slice(-6)}`;
}

function envClientId(): string | undefined {
  return process.env.GOOGLE_CLIENT_ID?.trim() || undefined;
}

function envClientSecret(): string | undefined {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() || undefined;
}

function settingsClientId(): string | undefined {
  return loadFile().clientId?.trim() || undefined;
}

function settingsClientSecret(): string | undefined {
  return vaultStore.getPlaintext(GOOGLE_OAUTH_SECRET_VAULT_ID)?.trim() || undefined;
}

export function googleRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI?.trim() ??
    `http://localhost:${process.env.PORT ?? 4600}/api/mail/oauth/google/callback`
  );
}

export function resolveGoogleClientId(): string | null {
  return envClientId() ?? settingsClientId() ?? null;
}

export function resolveGoogleClientSecret(): string | null {
  return envClientSecret() ?? settingsClientSecret() ?? null;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(resolveGoogleClientId() && resolveGoogleClientSecret());
}

export function googleOAuthPublicStatus(): GoogleOAuthPublicStatus {
  const envId = envClientId();
  const envSecret = envClientSecret();
  const settingsId = settingsClientId();
  const settingsSecret = settingsClientSecret();
  const envConfigured = Boolean(envId && envSecret);
  const settingsStored = Boolean(settingsId && settingsSecret);
  const resolvedId = resolveGoogleClientId();
  const configured = Boolean(resolvedId && resolveGoogleClientSecret());

  let source: GoogleOAuthSource | null = null;
  if (configured) {
    source = envConfigured ? "env" : "settings";
  }

  return {
    configured,
    source,
    settingsStored,
    envConfigured,
    clientIdHint: resolvedId ? maskClientId(resolvedId) : null,
    redirectUri: googleRedirectUri(),
  };
}

export function saveGoogleOAuthSettings(input: {
  clientId: string;
  clientSecret: string;
}): GoogleOAuthPublicStatus {
  const clientId = input.clientId.trim();
  const clientSecret = input.clientSecret.trim();
  if (!clientId) throw new Error("Client ID is required");
  if (!clientSecret) throw new Error("Client secret is required");

  saveFile({ clientId });
  vaultStore.put({
    id: GOOGLE_OAUTH_SECRET_VAULT_ID,
    name: "Google OAuth client secret",
    scope: "oauth",
    plaintext: clientSecret,
    envName: "GOOGLE_CLIENT_SECRET",
  });
  return googleOAuthPublicStatus();
}

/** Update stored credentials; omit/blank secret keeps the existing vault value. */
export function updateGoogleOAuthSettings(input: {
  clientId?: string;
  clientSecret?: string;
}): GoogleOAuthPublicStatus {
  const existingId = settingsClientId();
  const existingSecret = settingsClientSecret();
  const nextId = input.clientId?.trim() || existingId;
  const nextSecret = input.clientSecret?.trim() || existingSecret;

  if (!nextId) throw new Error("Client ID is required");
  if (!nextSecret) throw new Error("Client secret is required");

  saveFile({ clientId: nextId });
  if (input.clientSecret?.trim()) {
    vaultStore.put({
      id: GOOGLE_OAUTH_SECRET_VAULT_ID,
      name: "Google OAuth client secret",
      scope: "oauth",
      plaintext: nextSecret,
      envName: "GOOGLE_CLIENT_SECRET",
    });
  }
  return googleOAuthPublicStatus();
}

export function clearGoogleOAuthSettings(): GoogleOAuthPublicStatus {
  try {
    fs.unlinkSync(configPath());
  } catch {
    // missing file is fine
  }
  vaultStore.delete(GOOGLE_OAUTH_SECRET_VAULT_ID);
  return googleOAuthPublicStatus();
}
