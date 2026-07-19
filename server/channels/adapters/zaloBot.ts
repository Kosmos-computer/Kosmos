/**
 * Zalo Bot API — long-poll getUpdates (OpenClaw zalo protocol).
 */
import type { ChannelConfig } from "../../../shared/types.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { chunkText } from "./httpUtil.js";
import {
  getMe,
  getUpdates,
  sendChatAction,
  sendMessage,
  type ZaloUpdate,
} from "../ported/zalo/api.js";

export function createZaloBotAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const token = cfg.token.trim();
  if (!token) throw new Error("Zalo bot requires token");
  let stopped = false;
  let botName = "zalo";

  async function poll(): Promise<void> {
    while (!stopped) {
      try {
        // Zalo returns a single update per getUpdates call (unlike Telegram).
        const res = await getUpdates(token, { timeout: 25 });
        const u = res.result as ZaloUpdate | undefined;
        if (!u?.message?.text || !u.message.chat?.id) continue;
        if (u.event_name && !u.event_name.includes("text")) continue;
        const chat = u.message.chat;
        onMessage({
          chatId: String(chat.id),
          label: u.message.from?.display_name || u.message.from?.name || String(chat.id),
          text: u.message.text.trim(),
          isGroup: chat.chat_type === "GROUP",
          mentioned: true,
        });
      } catch (err) {
        if (stopped) return;
        console.warn("[zalo] poll:", err instanceof Error ? err.message : err);
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }
  }

  return {
    async start() {
      const me = await getMe(token);
      botName = me.result?.account_name || me.result?.id || "zalo";
      void poll();
      return { botName };
    },
    stop() {
      stopped = true;
    },
    async send(chatId, text) {
      for (const part of chunkText(text, 2000)) {
        await sendMessage(token, { chat_id: chatId, text: part });
      }
    },
    async indicateTyping(chatId) {
      await sendChatAction(token, { chat_id: chatId, action: "typing" }).catch(() => {});
    },
  };
}
