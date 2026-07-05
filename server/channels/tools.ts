/**
 * Channel → agent tool adapter. Registers channel_send with the dynamic tool
 * registry so the agent (and headless automations) can push messages to
 * approved chats — "text me when the build finishes" becomes a one-tool call.
 *
 * Registered as a system-source tool: its internal gate is the approved-peer
 * allowlist enforced by the gateway (both directions), which is why it stays
 * usable in headless runs where policy "confirm" would degrade to deny.
 * Importing this module (server/index.ts does) wires channels into the agent.
 */
import { registerToolContributor } from "../agent/toolRegistry.js";
import { channelStore } from "./channelStore.js";
import { channelGateway } from "./gateway.js";

registerToolContributor(() => {
  // No channels configured → no tool: the model never sees a capability the
  // instance can't perform (the "disabled = invisible" principle).
  const channels = channelStore.list().filter((c) => c.enabled);
  if (channels.length === 0) return [];

  // Enumerate approved destinations in the description so the model can pick
  // ids without a discovery round-trip — the peer list is small by design.
  const destinations = channels
    .map((c) => {
      const peers = channelStore.peers(c.id)
        .map((p) => `chatId "${p.chatId}" (${p.label})`)
        .join(", ");
      return `channelId "${c.id}" (${c.kind}): ${peers || "no approved chats"}`;
    })
    .join("; ");

  return [
    {
      name: "channel_send",
      description:
        `Send a message to the user on an external messaging channel (proactive outbound). ` +
        `Only approved chats accept messages. Destinations: ${destinations}.`,
      parameters: {
        type: "object",
        properties: {
          channelId: { type: "string", description: "Configured channel id" },
          chatId: { type: "string", description: "Approved chat id on that channel" },
          message: { type: "string", description: "Plain-text message to deliver" },
        },
        required: ["channelId", "chatId", "message"],
      },
      source: { kind: "system" },
      access: "write",
      execute: async (args) => {
        const channelId = String(args.channelId ?? "");
        const chatId = String(args.chatId ?? "");
        const message = String(args.message ?? "");
        if (!message.trim()) return { error: "message is required" };
        try {
          await channelGateway.send(channelId, chatId, message);
          return { ok: true, delivered: `${channelId}:${chatId}` };
        } catch (err) {
          return { error: err instanceof Error ? err.message : "Send failed" };
        }
      },
    },
  ];
});
