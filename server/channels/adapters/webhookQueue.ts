/**
 * Inbound webhook queue — webhook HTTP handlers push InboundMessages here;
 * adapters drain them and call the gateway onMessage callback.
 */
import type { InboundMessage } from "../gateway.js";

type Listener = (msg: InboundMessage) => void;

const listeners = new Map<string, Listener>();
const pending = new Map<string, InboundMessage[]>();

export function registerWebhookListener(channelId: string, listener: Listener): void {
  listeners.set(channelId, listener);
  const queued = pending.get(channelId) ?? [];
  pending.delete(channelId);
  for (const msg of queued) listener(msg);
}

export function unregisterWebhookListener(channelId: string): void {
  listeners.delete(channelId);
}

/** Called from HTTP webhook routes. */
export function pushWebhookInbound(channelId: string, msg: InboundMessage): void {
  const listener = listeners.get(channelId);
  if (listener) {
    listener(msg);
    return;
  }
  const q = pending.get(channelId) ?? [];
  q.push(msg);
  pending.set(channelId, q.slice(-50));
}
