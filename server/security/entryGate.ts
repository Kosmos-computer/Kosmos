import { createHmac, timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";

const ENTRY_COOKIE = "kosmos_entry";
const ENTRY_PATH = "/entry/";
const COOKIE_CONTEXT = "kosmos-entry-cookie:v1";
const MIN_KEY_LENGTH = 32;
const CONTROL_PLANE_FALLBACK = "https://kosmos-control-plane.fly.dev";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wallHtml(recoverUrl: string | null): string {
  const recover = recoverUrl
    ? `<p class="recover"><a href="${escapeHtml(recoverUrl)}">Recover access</a> — sign in with your checkout email or instance name to open the invitation link.</p>`
    : `<p class="recover">Ask your admin for the invitation link, or open Kosmos Cloud sign-in if you have an account.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Private Kosmos</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #111318; color: #f4f5f7; }
    main { width: min(32rem, calc(100% - 3rem)); text-align: center; }
    h1 { margin: 0 0 .75rem; font-size: 1.5rem; letter-spacing: 0; }
    p { margin: 0; color: #aeb4bf; line-height: 1.5; }
    p.recover { margin-top: 1.25rem; }
    a { color: #9ec1ff; text-decoration: underline; text-underline-offset: 0.15em; }
    a:hover { color: #c5d9ff; }
  </style>
</head>
<body><main><h1>Private Kosmos</h1><p>Use the invitation link for this instance.</p>${recover}</main></body>
</html>`;
}

export interface EntryGateOptions {
  /** URL-safe secret placed after /entry/. Defaults to ARCO_ENTRY_MAGIC_KEY. */
  key?: string;
  secureCookies?: boolean;
  /**
   * Control-plane sign-in URL for “Recover access”.
   * Defaults to KOSMOS_CONTROL_PLANE_URL + /signin (or the hosted fallback).
   */
  recoverUrl?: string | null;
}

function equalSecret(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function cookieValue(key: string): string {
  return createHmac("sha256", key).update(COOKIE_CONTEXT).digest("base64url");
}

function resolveRecoverUrl(options: EntryGateOptions): string | null {
  if (options.recoverUrl === null) return null;
  if (typeof options.recoverUrl === "string" && options.recoverUrl.trim()) {
    return options.recoverUrl.trim().replace(/\/+$/, "");
  }
  const base = (process.env.KOSMOS_CONTROL_PLANE_URL?.trim() || CONTROL_PLANE_FALLBACK).replace(/\/+$/, "");
  return `${base}/signin`;
}

/**
 * Require a one-time visit to /entry/<key> before exposing any Kosmos route.
 * The URL secret never goes into the cookie; rotating the key invalidates all
 * existing entry cookies because their derived value changes as well.
 */
export function createEntryGate(options: EntryGateOptions = {}): MiddlewareHandler {
  const key = (options.key ?? process.env.ARCO_ENTRY_MAGIC_KEY ?? "").trim();
  if (!key) return async (_c, next) => next();
  if (key.length < MIN_KEY_LENGTH) {
    throw new Error(`ARCO_ENTRY_MAGIC_KEY must be at least ${MIN_KEY_LENGTH} characters`);
  }

  const expectedCookie = cookieValue(key);
  const secure = options.secureCookies ?? process.env.ARCO_SECURE_COOKIES === "1";
  const html = wallHtml(resolveRecoverUrl(options));

  return async (c, next) => {
    // Deployment probes need a stable endpoint but reveal no platform data.
    if (c.req.path === "/health") return c.json({ ok: true });

    if (c.req.method === "GET" && c.req.path.startsWith(ENTRY_PATH)) {
      let supplied = "";
      try {
        supplied = decodeURIComponent(c.req.path.slice(ENTRY_PATH.length));
      } catch {
        // Treat malformed URL encoding exactly like a wrong key.
      }
      if (equalSecret(supplied, key)) {
        setCookie(c, ENTRY_COOKIE, expectedCookie, {
          httpOnly: true,
          sameSite: "Lax",
          secure,
          path: "/",
          maxAge: 30 * 24 * 60 * 60,
        });
        c.header("Cache-Control", "no-store");
        c.header("Referrer-Policy", "no-referrer");
        return c.redirect("/", 303);
      }
    }

    const presentedCookie = getCookie(c, ENTRY_COOKIE) ?? "";
    if (equalSecret(presentedCookie, expectedCookie)) return next();

    return c.html(html, 403, {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    });
  };
}
