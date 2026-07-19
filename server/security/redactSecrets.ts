/**
 * Strip API-key-shaped material from strings before they leave the server
 * (error payloads, proxied upstream bodies, logs).
 */

const SECRETISH =
  /\b(?:sk-(?:[A-Za-z0-9_\-]{6,}|\.{2,}[A-Za-z0-9_\-]{2,}|…[A-Za-z0-9_\-]{2,})|Bearer\s+[A-Za-z0-9._\-]{8,}|key-[A-Za-z0-9_\-]{8,})\b/gi;

const ECHO_PATTERNS: RegExp[] = [
  /Received API Key\s*=\s*\S+/gi,
  /Key Hash\s*\([^)]*\)\s*=\s*\S+/gi,
  /api[_-]?key["']?\s*[:=]\s*["']?[^"',\s}]+/gi,
  /Authorization["']?\s*[:=]\s*["']?Bearer\s+\S+/gi,
];

/** Redact key-like tokens and common upstream echo phrases from user-facing text. */
export function redactSecretsInText(text: string): string {
  let out = text;
  for (const pattern of ECHO_PATTERNS) {
    out = out.replace(pattern, "[redacted]");
  }
  out = out.replace(SECRETISH, "[redacted]");
  return out;
}
