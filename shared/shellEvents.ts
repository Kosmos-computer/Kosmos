/**
 * Envelope for GET /api/shell-events — out-of-band agent → desktop channel.
 * Chat SSE stays a bare AgentEvent stream; shell-events carry an optional
 * sessionId so drawer activity does not land on whichever chat is focused.
 */
import type { AgentEvent } from "./types.js";

export interface ShellEventEnvelope {
  sessionId?: string | null;
  event: AgentEvent;
}

export function isShellEventEnvelope(value: unknown): value is ShellEventEnvelope {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return rec.event != null && typeof rec.event === "object" && "type" in (rec.event as object);
}

/** Normalize legacy bare AgentEvent payloads and current envelopes. */
export function parseShellEventPayload(value: unknown): {
  sessionId: string | null;
  event: AgentEvent;
} | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (rec.type === "ping") return null;
  if (isShellEventEnvelope(value)) {
    return {
      sessionId: typeof value.sessionId === "string" ? value.sessionId : null,
      event: value.event,
    };
  }
  if (typeof rec.type === "string") {
    return { sessionId: null, event: value as AgentEvent };
  }
  return null;
}
