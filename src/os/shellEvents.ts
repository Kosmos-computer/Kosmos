/**
 * Out-of-band agent → desktop channel. Chat turns deliver their events over
 * the chat's own SSE response; turns started elsewhere (voice conversations
 * via the /v1 endpoint, headless callers) broadcast shell-relevant events on
 * GET /api/shell-events. One EventSource per desktop routes them into the
 * same handleShellEvent dispatch the chat stream uses, so "open the tasks
 * app" behaves identically whether typed or spoken.
 *
 * Payloads are ShellEventEnvelope `{ sessionId, event }` so drawer activity
 * stays partitioned. Legacy bare AgentEvent payloads still parse.
 *
 * Connection state is published for the menubar tools tray — voice turns
 * treat an open channel as "interactive" (cursor + confirmations).
 */
import { useSyncExternalStore } from "react";
import { parseShellEventPayload } from "@shared/shellEvents";
import { handleShellEvent } from "./osActions";
import { useOsStore } from "./osStore";

export type ShellEventsStatus = "connecting" | "connected" | "disconnected";

let status: ShellEventsStatus = "disconnected";
const listeners = new Set<() => void>();

function setStatus(next: ShellEventsStatus): void {
  if (status === next) return;
  status = next;
  for (const listener of listeners) listener();
}

export function getShellEventsStatus(): ShellEventsStatus {
  return status;
}

export function subscribeShellEventsStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useShellEventsStatus(): ShellEventsStatus {
  return useSyncExternalStore(subscribeShellEventsStatus, getShellEventsStatus, getShellEventsStatus);
}

export function connectShellEvents(): () => void {
  const source = new EventSource("/api/shell-events");
  setStatus(source.readyState === EventSource.OPEN ? "connected" : "connecting");

  source.onopen = () => setStatus("connected");
  source.onerror = () => {
    // Browser auto-reconnects; surface the gap so voice/cursor status stays honest.
    setStatus(source.readyState === EventSource.CLOSED ? "disconnected" : "connecting");
  };
  source.onmessage = (message: MessageEvent<string>) => {
    let raw: unknown;
    try {
      raw = JSON.parse(message.data) as unknown;
    } catch {
      return;
    }
    const parsed = parseShellEventPayload(raw);
    if (!parsed) return;
    const { sessionId, event } = parsed;

    // Approvals from streamless turns get a desktop-level card (chat turns
    // render theirs inline in the thread and never reach this channel).
    if (event.type === "confirm_required") {
      useOsStore.getState().addShellConfirm({
        confirmId: event.confirmId,
        command: event.command,
        ...(event.options ? { options: event.options } : {}),
      });
      return;
    }
    if (event.type === "confirm_resolved") {
      useOsStore.getState().removeShellConfirm(event.confirmId);
      return;
    }
    // Everything else (os_ui, cursor_request, apps_changed, file_changed)
    // reuses the exact dispatch chat streams go through.
    handleShellEvent(event, sessionId);
  };

  return () => {
    source.onopen = null;
    source.onerror = null;
    source.onmessage = null;
    source.close();
    setStatus("disconnected");
  };
}
