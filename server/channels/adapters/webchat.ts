/**
 * WebChat — guest browser sessions talk to the agent via HTTP on this instance.
 * Pairing uses the same channelStore peer model; chatId = browser session id.
 */
import type { ChannelConfig } from "../../../shared/types.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { registerWebhookListener, unregisterWebhookListener } from "./webhookQueue.js";

/** Outbound mailbox: chatId → queued replies for the WebChat client to poll. */
const mailboxes = new Map<string, string[]>();

export function webchatPushReply(channelId: string, chatId: string, text: string): void {
  const key = `${channelId}:${chatId}`;
  const q = mailboxes.get(key) ?? [];
  q.push(text);
  mailboxes.set(key, q.slice(-20));
}

export function webchatDrainReplies(channelId: string, chatId: string): string[] {
  const key = `${channelId}:${chatId}`;
  const q = mailboxes.get(key) ?? [];
  mailboxes.set(key, []);
  return q;
}

export function createWebchatAdapter(
  channelId: string,
  _cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  return {
    async start() {
      registerWebhookListener(channelId, onMessage);
      return { botName: "webchat" };
    },
    stop() {
      unregisterWebhookListener(channelId);
    },
    async send(chatId, text) {
      webchatPushReply(channelId, chatId, text);
    },
    async indicateTyping() {},
  };
}
