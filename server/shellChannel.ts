/**
 * Shell channel bookkeeping — the server side of GET /api/shell-events.
 *
 * Agent turns that run outside a chat stream (voice via /v1) need two things
 * from the desktop: a place to send shell events (os_ui, cursor_request,
 * confirm_required) and to know whether anyone is listening at all. A turn
 * with no connected desktop must run headless (cursor tools refuse,
 * confirmations deny) rather than parking on an answer that can never come.
 */
import type { AgentEvent } from "../shared/types.js";
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

/** Deliver one event to every connected desktop. */
export function broadcastShellEvent(event: AgentEvent): void {
  bus.emit("shell_event", event);
}
