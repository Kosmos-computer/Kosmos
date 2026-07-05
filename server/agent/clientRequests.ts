/**
 * Client-request round trip — the confirmations pattern generalized: a tool
 * emits an AgentEvent asking the shell to do something client-side (drive the
 * cursor, snapshot the DOM), parks a promise here, and the shell answers via
 * POST /api/client-requests/:id. No answer within the timeout resolves to a
 * timeout error rather than hanging the agent loop.
 */
import crypto from "node:crypto";

/**
 * Generous enough for a long cursor travel + settle animation plus
 * character-by-character typing; short enough that a dead tab doesn't stall
 * the whole turn.
 */
const TIMEOUT_MS = 20_000;

interface PendingRequest {
  resolve: (result: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

const pending = new Map<string, PendingRequest>();

/**
 * Park until the shell answers (or the timeout trips). The caller emits the
 * matching `cursor_request` event itself — this module only owns the wait.
 */
export function requestClientAction<T>(): { requestId: string; result: Promise<T> } {
  const requestId = crypto.randomUUID();
  const result = new Promise<T>((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      resolve({
        ok: false,
        error: "The shell did not respond in time. Is a browser tab attached and visible?",
      } as T);
    }, TIMEOUT_MS);
    pending.set(requestId, { resolve: resolve as (result: unknown) => void, timer });
  });
  return { requestId, result };
}

/** Answer a pending request. Returns false for unknown/expired ids. */
export function resolveClientRequest(requestId: string, result: unknown): boolean {
  const entry = pending.get(requestId);
  if (!entry) return false;
  clearTimeout(entry.timer);
  pending.delete(requestId);
  entry.resolve(result);
  return true;
}
