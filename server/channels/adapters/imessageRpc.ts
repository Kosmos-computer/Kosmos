/**
 * iMessage via OpenClaw imsg JSON-RPC client (macOS only).
 */
import type { ChannelConfig } from "../../../shared/types.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { chunkText } from "./httpUtil.js";
import { IMessageRpcClient } from "../ported/imessage/client.js";

export function createImessageRpcAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const cliPath = cfg.token.trim() || "imsg";
  let client: IMessageRpcClient | null = null;
  let stopped = false;

  return {
    async start() {
      if (process.platform !== "darwin") {
        throw new Error("iMessage requires macOS with imsg installed");
      }
      client = new IMessageRpcClient({
        cliPath,
        runtime: {
          log: (m) => console.log("[imessage]", m),
          error: (m) => console.warn("[imessage]", m),
        },
        onNotification: (msg) => {
          if (stopped) return;
          if (msg.method !== "message" && msg.method !== "watch.message") return;
          const p = (msg.params ?? {}) as {
            text?: string;
            body?: string;
            chat_id?: string;
            chatId?: string;
            guid?: string;
            sender?: string;
            handle?: string;
            is_group?: boolean;
            isGroup?: boolean;
          };
          const text = (p.text || p.body || "").trim();
          const chatId = String(p.chat_id || p.chatId || p.guid || "");
          if (!text || !chatId) return;
          onMessage({
            chatId,
            label: p.sender || p.handle || chatId,
            text,
            isGroup: Boolean(p.is_group ?? p.isGroup),
            mentioned: true,
          });
        },
      });
      await client.start();
      // Subscribe to new messages (OpenClaw watch.subscribe)
      try {
        await client.request("watch.subscribe", { since_rowid: 0 });
      } catch {
        try {
          await client.request("watch", {});
        } catch (err) {
          console.warn(
            "[imessage] watch subscribe failed — ensure imsg supports RPC watch:",
            err instanceof Error ? err.message : err,
          );
        }
      }
      return { botName: "imessage" };
    },
    stop() {
      stopped = true;
      void client?.stop();
      client = null;
    },
    async send(chatId, text) {
      if (!client) throw new Error("iMessage not connected");
      for (const part of chunkText(text, 4000)) {
        await client.request("send", { to: chatId, text: part });
      }
    },
    async indicateTyping() {},
  };
}
