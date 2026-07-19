/**
 * ClickClack — event poll + channel send (OpenClaw http-client).
 */
import type { ChannelConfig } from "../../../shared/types.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { chunkText, opt } from "./httpUtil.js";
import { createClickClackClient } from "../ported/clickclack/http-client.js";

export function createClickclackAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const baseUrl = opt(cfg, "baseUrl");
  const token = cfg.token.trim();
  if (!baseUrl || !token) throw new Error("ClickClack requires token and options.baseUrl");
  const client = createClickClackClient({ baseUrl, token });
  let stopped = false;
  let workspaceId = opt(cfg, "workspaceId");
  let cursor: string | undefined;

  async function poll(): Promise<void> {
    while (!stopped) {
      try {
        if (!workspaceId) {
          const spaces = await client.workspaces();
          workspaceId = spaces[0]?.id;
          if (!workspaceId) throw new Error("no ClickClack workspace");
        }
        const page = await client.eventPage(workspaceId, {
          afterCursor: cursor,
          limit: 50,
          includeTail: !cursor,
        });
        if (page.tailCursor) cursor = page.tailCursor;
        for (const ev of page.events ?? []) {
          const raw = ev as {
            type?: string;
            message?: {
              id?: string;
              body?: string;
              channel_id?: string;
              conversation_id?: string;
              author?: { display_name?: string; id?: string };
            };
          };
          const msg = raw.message;
          if (!msg?.body?.trim()) continue;
          const chatId = msg.channel_id || msg.conversation_id;
          if (!chatId) continue;
          onMessage({
            chatId,
            label: msg.author?.display_name || msg.author?.id || chatId,
            text: msg.body.trim(),
            isGroup: Boolean(msg.channel_id),
            mentioned: true,
          });
        }
      } catch (err) {
        if (stopped) return;
        console.warn("[clickclack] poll:", err instanceof Error ? err.message : err);
        await new Promise((r) => setTimeout(r, 5_000));
      }
      await new Promise((r) => setTimeout(r, 2_000));
    }
  }

  return {
    async start() {
      const me = await client.me();
      void poll();
      return { botName: me.display_name || me.id || "clickclack" };
    },
    stop() {
      stopped = true;
    },
    async send(chatId, text) {
      for (const part of chunkText(text, 4000)) {
        // Heuristic: channel ids vs DM conversation ids — try channel then DM.
        try {
          await client.createChannelMessage(chatId, part);
        } catch {
          await client.createDirectMessage(chatId, part);
        }
      }
    },
    async indicateTyping() {},
  };
}
