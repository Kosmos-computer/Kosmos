/**
 * GitHub OAuth helpers — authorize URL, code exchange, and profile lookup.
 */
import crypto from "node:crypto";

const AUTH_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";

const SCOPES = ["read:user", "repo"].join(" ");

const pendingStates = new Map<string, { userId: string; expiresAt: number }>();

function clientId(): string {
  const value = process.env.GITHUB_CLIENT_ID?.trim();
  if (!value) throw new Error("GITHUB_CLIENT_ID is not configured");
  return value;
}

function clientSecret(): string {
  const value = process.env.GITHUB_CLIENT_SECRET?.trim();
  if (!value) throw new Error("GITHUB_CLIENT_SECRET is not configured");
  return value;
}

export function githubRedirectUri(): string {
  return (
    process.env.GITHUB_REDIRECT_URI?.trim() ??
    `http://localhost:${process.env.PORT ?? 4600}/api/github/oauth/callback`
  );
}

export function webOriginAfterOAuth(): string {
  return process.env.ARCO_WEB_ORIGIN?.trim() ?? "http://localhost:4610";
}

export function isGitHubOAuthConfigured(): boolean {
  return Boolean(process.env.GITHUB_CLIENT_ID?.trim() && process.env.GITHUB_CLIENT_SECRET?.trim());
}

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

export function buildGitHubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: githubRedirectUri(),
    scope: SCOPES,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function tokenRequest(body: Record<string, string>): Promise<{ access_token: string }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(body).toString(),
  });
  const data = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? `GitHub token error (${res.status})`);
  }
  return { access_token: data.access_token };
}

export async function resolveGitHubLogin(accessToken: string): Promise<string> {
  const res = await fetch(USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const data = (await res.json()) as { login?: string; message?: string };
  if (!res.ok || !data.login) {
    throw new Error(data.message ?? "Could not read GitHub profile");
  }
  return data.login;
}

export async function exchangeGitHubCode(code: string): Promise<{
  login: string;
  accessToken: string;
}> {
  const tokens = await tokenRequest({
    code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: githubRedirectUri(),
    grant_type: "authorization_code",
  });
  const login = await resolveGitHubLogin(tokens.access_token);
  return { login, accessToken: tokens.access_token };
}
