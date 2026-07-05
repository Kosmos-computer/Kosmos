/**
 * Out-of-band agent → desktop channel. Chat turns deliver their events over
 * the chat's own SSE response; turns started elsewhere (voice conversations
 * via the /v1 endpoint, headless callers) broadcast shell-relevant events on
 * GET /api/shell-events. One EventSource per desktop routes them into the
 * same handleShellEvent dispatch the chat stream uses, so "open the tasks
 * app" behaves identically whether typed or spoken.
 */
import type { AgentEvent } from "@shared/types";
import { handleShellEvent } from "./osActions";
import { useOsStore } from "./osStore";

export function connectShellEvents(): () => void {
  const source = new EventSource("/api/shell-events");
  source.onmessage = (message: MessageEvent<string>) => {
    let event: AgentEvent;
    try {
      event = JSON.parse(message.data) as AgentEvent;
    } catch {
      return;
    }
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
    // reuses the exact dispatch chat streams go through. Keep-alive pings
    // fall through to the ignored default case.
    handleShellEvent(event);
  };
  // EventSource reconnects automatically on error — nothing to do.
  return () => source.close();
}
