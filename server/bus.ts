/**
 * Tiny process-local event bus — decouples the tool layer from the automation
 * scheduler (tools announce "automations_changed"; the scheduler resyncs cron
 * jobs) without a circular import between tools → scheduler → agent loop → tools.
 */
import { EventEmitter } from "node:events";

export const bus = new EventEmitter();

/**
 * Announce a platform event topic (e.g. "files.changed", "calendar.changed").
 * Two audiences, one call:
 *  - `app-event:<topic>` for in-process subscribers (services, supervisors)
 *  - `shell_event` so every connected desktop hears it over /api/shell-events
 *    and can forward it into app windows whose manifests subscribe to it
 */
export function announceAppEvent(topic: string, detail: { appId: string; payload?: unknown }): void {
  bus.emit(`app-event:${topic}`, detail);
  // Platform topics are not chat-session-scoped — envelope with null sessionId.
  bus.emit("shell_event", {
    sessionId: null,
    event: { type: "app_event", topic },
  });
}
