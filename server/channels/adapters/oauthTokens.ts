/**
 * Outbound OAuth helpers for Bot Framework (Teams) and Google Chat service accounts.
 * Shapes match OpenClaw msteams oauth + googlechat auth (raw fetch, no SDKs).
 */
import { createHmac, createSign, createVerify, randomUUID, timingSafeEqual } from "node:crypto";
import fs from "node:fs";

export interface TeamsConversationRef {
  serviceUrl: string;
  conversationId: string;
  tenantId?: string;
  botId?: string;
  userId?: string;
  userName?: string;
  conversationType?: string;
}

export interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const teamsTokenCache = new Map<string, { token: string; exp: number }>();
const gchatTokenCache = new Map<string, { token: string; exp: number }>();

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

/** RS256 JWT for Google SA → oauth2 token exchange. */
export function signRs256Jwt(
  claims: Record<string, unknown>,
  privateKeyPem: string,
): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify(claims));
  const data = `${header}.${payload}`;
  const sig = createSign("RSA-SHA256").update(data).sign(privateKeyPem);
  return `${data}.${b64url(sig)}`;
}

export function parseGoogleServiceAccount(raw: string): GoogleServiceAccount {
  const trimmed = raw.trim();
  let json = trimmed;
  if (!trimmed.startsWith("{") && fs.existsSync(trimmed)) {
    json = fs.readFileSync(trimmed, "utf8");
  }
  const sa = JSON.parse(json) as GoogleServiceAccount;
  if (!sa.client_email || !sa.private_key) {
    throw new Error("Google Chat service account JSON needs client_email and private_key");
  }
  sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  return sa;
}

export async function mintTeamsBotToken(params: {
  appId: string;
  appPassword: string;
  tenantId?: string;
}): Promise<string> {
  const tenant = params.tenantId?.trim() || "botframework.com";
  const cacheKey = `${tenant}:${params.appId}`;
  const hit = teamsTokenCache.get(cacheKey);
  if (hit && Date.now() < hit.exp) return hit.token;

  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: params.appId,
        client_secret: params.appPassword,
        scope: "https://api.botframework.com/.default",
      }),
    },
  );
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      `Teams token: ${data.error_description || data.error || res.status}`,
    );
  }
  const exp = Date.now() + Math.max(60, (data.expires_in ?? 3600) - 120) * 1000;
  teamsTokenCache.set(cacheKey, { token: data.access_token, exp });
  return data.access_token;
}

export async function mintGoogleChatToken(sa: GoogleServiceAccount): Promise<string> {
  const cacheKey = sa.client_email;
  const hit = gchatTokenCache.get(cacheKey);
  if (hit && Date.now() < hit.exp) return hit.token;

  const now = Math.floor(Date.now() / 1000);
  const assertion = signRs256Jwt(
    {
      iss: sa.client_email,
      sub: sa.client_email,
      aud: sa.token_uri || "https://oauth2.googleapis.com/token",
      scope: "https://www.googleapis.com/auth/chat.bot",
      iat: now,
      exp: now + 3600,
      jti: randomUUID(),
    },
    sa.private_key,
  );
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      `Google Chat token: ${data.error_description || data.error || res.status}`,
    );
  }
  const exp = Date.now() + Math.max(60, (data.expires_in ?? 3600) - 120) * 1000;
  gchatTokenCache.set(cacheKey, { token: data.access_token, exp });
  return data.access_token;
}

export function encodeTeamsChatId(ref: TeamsConversationRef): string {
  return JSON.stringify(ref);
}

export function decodeTeamsChatId(chatId: string): TeamsConversationRef | null {
  try {
    const ref = JSON.parse(chatId) as TeamsConversationRef;
    if (ref.serviceUrl && ref.conversationId) return ref;
  } catch {
    /* not JSON */
  }
  return null;
}

export function encodeGoogleChatId(space: string, thread?: string): string {
  if (!thread) return space;
  return JSON.stringify({ space, thread });
}

export function decodeGoogleChatId(chatId: string): { space: string; thread?: string } {
  try {
    const o = JSON.parse(chatId) as { space?: string; thread?: string };
    if (o.space) return { space: o.space, thread: o.thread };
  } catch {
    /* plain space name */
  }
  return { space: chatId };
}

/** Verify Google Chat inbound Bearer JWT against chat@system certs (OpenClaw auth.ts). */
export async function verifyGoogleChatInboundJwt(
  bearer: string,
  audience: string,
): Promise<boolean> {
  const token = bearer.replace(/^Bearer\s+/i, "").trim();
  if (!token || !audience) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  let header: { kid?: string; alg?: string };
  let payload: { iss?: string; aud?: string | string[]; exp?: number };
  try {
    header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as typeof header;
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as typeof payload;
  } catch {
    return false;
  }
  if (payload.iss !== "chat@system.gserviceaccount.com") return false;
  const audOk = Array.isArray(payload.aud)
    ? payload.aud.includes(audience)
    : payload.aud === audience;
  if (!audOk) return false;
  if (payload.exp && payload.exp * 1000 < Date.now() - 60_000) return false;

  const certsRes = await fetch(
    "https://www.googleapis.com/service_accounts/v1/metadata/x509/chat@system.gserviceaccount.com",
    { signal: AbortSignal.timeout(15_000) },
  );
  if (!certsRes.ok) return false;
  const certs = (await certsRes.json()) as Record<string, string>;
  const pem = (header.kid && certs[header.kid]) || Object.values(certs)[0];
  if (!pem) return false;
  const data = `${parts[0]}.${parts[1]}`;
  const sig = Buffer.from(parts[2], "base64url");
  try {
    return createVerify("RSA-SHA256").update(data).verify(pem, sig);
  } catch {
    return false;
  }
}

/** Lightweight Teams inbound JWT checks: aud === appId, not expired, known iss. */
export function peekTeamsInboundJwt(
  bearer: string,
  appId: string,
): { ok: boolean; reason?: string } {
  const token = bearer.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, reason: "missing Authorization" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed jwt" };
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      aud?: string | string[];
      iss?: string;
      exp?: number;
    };
    const audList = (Array.isArray(payload.aud) ? payload.aud : [payload.aud]).filter(
      Boolean,
    ) as string[];
    if (audList.includes("https://api.botframework.com") && !audList.includes(appId)) {
      return { ok: false, reason: "rejected botframework audience" };
    }
    if (!audList.includes(appId)) {
      return { ok: false, reason: `aud mismatch (got ${audList.join(",") || "?"}, want appId)` };
    }
    if (payload.exp && payload.exp * 1000 < Date.now() - 60_000) {
      return { ok: false, reason: "expired" };
    }
    const iss = payload.iss ?? "";
    const issOk =
      iss === "https://api.botframework.com" ||
      iss.startsWith("https://sts.windows.net/") ||
      iss.includes("login.microsoftonline.com");
    if (!issOk) return { ok: false, reason: `unexpected iss ${iss}` };
    return { ok: true };
  } catch {
    return { ok: false, reason: "jwt parse failed" };
  }
}

/** Twilio request signature validation (OpenClaw sms/webhook). */
export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!authToken || !signature) return false;
  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  const digest = createHmac("sha1", authToken).update(sorted, "utf8").digest("base64");
  try {
    const a = Buffer.from(digest);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
