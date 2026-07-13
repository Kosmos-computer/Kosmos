/**
 * Google OAuth helpers for Gmail — token exchange, refresh, and profile lookup.
 * Uses fetch only (no googleapis dependency).
 */
import crypto from "node:crypto";
import {
  googleRedirectUri as configuredRedirectUri,
  isGoogleOAuthConfigured,
  resolveGoogleClientId,
  resolveGoogleClientSecret,
} from "./googleOAuthConfig.js";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
].join(" ");

const pendingStates = new Map<string, { userId: string; expiresAt: number }>();

function clientId(): string {
  const value = resolveGoogleClientId();
  if (!value) throw new Error("Google OAuth client ID is not configured");
  return value;
}

function clientSecret(): string {
  const value = resolveGoogleClientSecret();
  if (!value) throw new Error("Google OAuth client secret is not configured");
  return value;
}

export function googleRedirectUri(): string {
  return configuredRedirectUri();
}

export function webOriginAfterOAuth(): string {
  return process.env.ARCO_WEB_ORIGIN?.trim() ?? "http://localhost:4610";
}

export { isGoogleOAuthConfigured };

export function createOAuthState(userId: string): string {
  purgeExpiredStates();
  const state = crypto.randomBytes(24).toString("hex");
  pendingStates.set(state, { userId, expiresAt: Date.now() + 10 * 60_000 });
  return state;
}

export function consumeOAuthState(state: string): string | null {
  purgeExpiredStates();
  const entry = pendingStates.get(state);
  if (!entry) return null;
  pendingStates.delete(state);
  if (entry.expiresAt < Date.now()) return null;
  return entry.userId;
}

function purgeExpiredStates(): void {
  const now = Date.now();
  for (const [state, entry] of pendingStates) {
    if (entry.expiresAt < now) pendingStates.delete(state);
  }
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function tokenRequest(body: Record<string, string>): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? `Google token error (${res.status})`);
  }
  return {
    access_token: data.access_token,
    expires_in: data.expires_in ?? 3600,
    refresh_token: data.refresh_token,
  };
}

async function gmailAddress(accessToken: string): Promise<string> {
  const res = await fetch(GMAIL_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as { emailAddress?: string; error?: { message?: string } };
  if (!res.ok || !data.emailAddress) {
    throw new Error(data.error?.message ?? "Could not read Gmail profile");
  }
  return data.emailAddress;
}

export async function exchangeGoogleCode(code: string): Promise<{
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const tokens = await tokenRequest({
    code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: googleRedirectUri(),
    grant_type: "authorization_code",
  });
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token — revoke prior access and reconnect");
  }
  const email = await gmailAddress(tokens.access_token);
  return {
    email,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const tokens = await tokenRequest({
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  return { accessToken: tokens.access_token, expiresIn: tokens.expires_in };
}
