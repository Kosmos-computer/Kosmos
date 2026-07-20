/**
 * Shell channel bookkeeping — the server side of GET /api/shell-events.
 *
 * Agent turns that run outside a chat stream (voice via /v1) need two things
 * from the desktop: a place to send shell events (os_ui, cursor_request,
 * confirm_required) and to know whether anyone is listening at all. A turn
 * with no connected desktop must run headless (cursor tools refuse,
 * confirmations deny) rather than parking on an answer that can never come.
 *
 * Events are broadcast as ShellEventEnvelope so drawer activity can be
 * scoped to the originating session instead of the focused chat.
 */
import type { AgentEvent } from "../shared/types.js";
import type { ShellEventEnvelope } from "../shared/shellEvents.js";
import { bus } from "./bus.js";

let clients = 0;

/** Called by the /api/shell-events route on connect/disconnect. */
export function shellClientConnected(): () => void {
  clients += 1;
  let disconnected = false;
  return () => {
    if (!disconnected) {
      disconnected = true;
      clients -= 1;
    }
  };
}

/** True when at least one desktop can receive events and answer approvals. */
export function hasShellClients(): boolean {
  return clients > 0;
}

/** How many desktops currently hold an open shell-events stream. */
export function shellClientCount(): number {
  return clients;
}

/**
 * Voice turns often land right after a server restart, while EventSource is
 * still reconnecting. Wait briefly before declaring the turn headless.
 */
export async function waitForShellClients(timeoutMs = 2_000): Promise<boolean> {
  if (clients > 0) return true;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (clients > 0) return true;
  }
  return clients > 0;
}

/** Deliver one event to every connected desktop, optionally session-scoped. */
export function broadcastShellEvent(
  event: AgentEvent,
  sessionId?: string | null,
): void {
  const envelope: ShellEventEnvelope = {
    sessionId: sessionId ?? null,
    event,
  };
  bus.emit("shell_event", envelope);
}
