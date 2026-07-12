/**
 * Redact common secret patterns from logs and error strings.
 *
 * Not a substitute for encryption — stops accidental leakage when settings,
 * env dumps, or API errors are stringified into chat/audit/console.
 */

const MASK = "[REDACTED]";

/** Patterns ordered longest / most specific first where it matters. */
const SECRET_PATTERNS: RegExp[] = [
  // Bearer / basic auth headers
  /\b(Bearer|Basic)\s+[A-Za-z0-9\-._~+/]+=*/gi,
  // OpenAI / OpenRouter / similar sk- keys
  /\bsk-[A-Za-z0-9_-]{10,}\b/g,
  // Anthropic-style
  /\bsk-ant-[A-Za-z0-9_-]{10,}\b/g,
  // GitHub PATs
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  // Slack / Telegram-ish
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\b\d{8,10}:[A-Za-z0-9_-]{30,}\b/g,
  // Stripe
  /\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{16,}\b/g,
  /\bwhsec_[A-Za-z0-9]+/g,
  // AWS access key id (secret key is harder; still scrub AKIA…)
  /\bAKIA[0-9A-Z]{16}\b/g,
  // JWT (three base64url segments)
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  // JSON fields commonly holding secrets
  /("(?:api[_-]?key|apiKey|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|token|authorization|cursorApiKey)"\s*:\s*")([^"]+)(")/gi,
];

export function redactSecrets(input: string): string {
  let out = input;
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    out = out.replace(pattern, (match, ...args) => {
      // JSON field form: groups are (keyQuote, value, closeQuote)
      if (args.length >= 3 && typeof args[0] === "string" && args[0].startsWith('"')) {
        return `${args[0]}${MASK}${args[2]}`;
      }
      if (/^(Bearer|Basic)\s+/i.test(match)) {
        return `${match.split(/\s+/)[0]} ${MASK}`;
      }
      return MASK;
    });
  }
  return out;
}

/** Safe stringify for logs — JSON with secret field values redacted. */
export function redactSecretsDeep(value: unknown): unknown {
  if (typeof value === "string") return redactSecrets(value);
  if (Array.isArray(value)) return value.map(redactSecretsDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/api[_-]?key|token|secret|password|authorization|credential/i.test(k) && typeof v === "string") {
        out[k] = v ? MASK : v;
      } else {
        out[k] = redactSecretsDeep(v);
      }
    }
    return out;
  }
  return value;
}
