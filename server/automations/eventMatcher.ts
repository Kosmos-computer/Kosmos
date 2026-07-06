/**
 * Webhook event matching for event-triggered automations. GitHub is the v1
 * adapter: X-GitHub-Event + body.action compose the event key.
 */
import type { AutomationTrigger } from "../../shared/types.js";

export interface WebhookContext {
  headers: Record<string, string>;
  body: unknown;
}

function header(headers: Record<string, string>, name: string): string {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }
  return "";
}

function normalizeEventKey(source: string | undefined, headers: Record<string, string>, body: unknown): string {
  if (source === "github") {
    const event = header(headers, "x-github-event");
    const action =
      body && typeof body === "object" && "action" in body && typeof (body as { action: unknown }).action === "string"
        ? (body as { action: string }).action
        : "";
    return action ? `${event}.${action}` : event;
  }
  const generic = header(headers, "x-arco-event");
  if (generic) return generic;
  return "";
}

function matchesOn(pattern: string, eventKey: string): boolean {
  if (pattern === eventKey) return true;
  if (pattern.endsWith(".*")) {
    const prefix = pattern.slice(0, -2);
    return eventKey.startsWith(`${prefix}.`) || eventKey === prefix;
  }
  return false;
}

function matchesFilter(filter: string | undefined, body: unknown): boolean {
  if (!filter?.trim()) return true;
  try {
    const spec = JSON.parse(filter) as Record<string, unknown>;
    if (!body || typeof body !== "object") return false;
    const record = body as Record<string, unknown>;
    return Object.entries(spec).every(([key, expected]) => record[key] === expected);
  } catch {
    return false;
  }
}

export function eventTriggerMatches(trigger: AutomationTrigger, ctx: WebhookContext): boolean {
  if (trigger.type !== "event") return false;
  const eventKey = normalizeEventKey(trigger.source, ctx.headers, ctx.body);
  if (!eventKey) return false;

  const patterns = trigger.on
    ? Array.isArray(trigger.on)
      ? trigger.on
      : [trigger.on]
    : [];
  if (patterns.length === 0) return false;

  const patternHit = patterns.some((pattern) => matchesOn(pattern, eventKey));
  if (!patternHit) return false;
  return matchesFilter(trigger.filter, ctx.body);
}

export function verifyWebhookSecret(
  secret: string | undefined,
  headers: Record<string, string>,
  _rawBody: string,
): boolean {
  if (!secret) return true;
  const signature = header(headers, "x-arco-webhook-signature");
  if (!signature) return false;
  // Simple shared-secret compare for v1 (HMAC can be added when needed).
  return signature === secret || signature === `sha256=${secret}`;
}
