/**
 * Bot Framework inbound JWT verification — JWKS signature check (OpenClaw posture).
 */
import { createPublicKey, createVerify } from "node:crypto";

const OPENID_CONFIG =
  "https://login.botframework.com/v1/.well-known/openidconfiguration";
const OPENID_CONFIG_ALT =
  "https://login.microsoftonline.com/botframework.com/v2.0/.well-known/openid-configuration";

let jwksCache: { fetchedAt: number; keys: Map<string, string> } | null = null;

async function fetchJwks(): Promise<Map<string, string>> {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < 60 * 60 * 1000) return jwksCache.keys;

  const keys = new Map<string, string>();
  for (const metaUrl of [OPENID_CONFIG, OPENID_CONFIG_ALT]) {
    try {
      const meta = (await fetch(metaUrl, { signal: AbortSignal.timeout(10_000) }).then((r) =>
        r.json(),
      )) as { jwks_uri?: string };
      if (!meta.jwks_uri) continue;
      const jwks = (await fetch(meta.jwks_uri, { signal: AbortSignal.timeout(10_000) }).then((r) =>
        r.json(),
      )) as {
        keys?: Array<{
          kid?: string;
          kty?: string;
          n?: string;
          e?: string;
          x5c?: string[];
        }>;
      };
      for (const k of jwks.keys ?? []) {
        if (!k.kid) continue;
        if (k.x5c?.[0]) {
          keys.set(
            k.kid,
            `-----BEGIN CERTIFICATE-----\n${k.x5c[0]}\n-----END CERTIFICATE-----`,
          );
        } else if (k.kty === "RSA" && k.n && k.e) {
          const keyObj = createPublicKey({
            key: { kty: "RSA", n: k.n, e: k.e },
            format: "jwk",
          });
          keys.set(k.kid, keyObj.export({ type: "spki", format: "pem" }).toString());
        }
      }
      if (keys.size) break;
    } catch {
      /* try next metadata URL */
    }
  }
  jwksCache = { fetchedAt: now, keys };
  return keys;
}

export async function verifyTeamsInboundJwt(
  bearer: string,
  appId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const token = bearer.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false, reason: "missing Authorization" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed jwt" };

  let header: { kid?: string; alg?: string };
  let payload: {
    aud?: string | string[];
    iss?: string;
    exp?: number;
    serviceurl?: string;
  };
  try {
    header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as typeof header;
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as typeof payload;
  } catch {
    return { ok: false, reason: "jwt parse failed" };
  }

  const audList = (Array.isArray(payload.aud) ? payload.aud : [payload.aud]).filter(
    Boolean,
  ) as string[];
  if (audList.includes("https://api.botframework.com") && !audList.includes(appId)) {
    return { ok: false, reason: "rejected botframework audience" };
  }
  if (!audList.includes(appId)) {
    return { ok: false, reason: `aud mismatch (want appId)` };
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

  if (!header.kid) return { ok: false, reason: "missing kid" };
  const keys = await fetchJwks();
  const pem = keys.get(header.kid);
  if (!pem) return { ok: false, reason: `unknown kid ${header.kid}` };

  const data = `${parts[0]}.${parts[1]}`;
  const sig = Buffer.from(parts[2], "base64url");
  try {
    const ok = createVerify("RSA-SHA256").update(data).verify(pem, sig);
    return ok ? { ok: true } : { ok: false, reason: "bad signature" };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "verify failed" };
  }
}
