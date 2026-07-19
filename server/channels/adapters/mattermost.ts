/**
 * Mattermost bot — REST send + WebSocket events (no SDK).
 */
import type { ChannelConfig } from "../../../shared/types.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { chunkText, jsonFetch, opt } from "./httpUtil.js";

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, "").replace(/\/api\/v4$/i, "");
}

export function createMattermostAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const base = normalizeBase(opt(cfg, "baseUrl"));
  if (!base) throw new Error("Mattermost requires options.baseUrl");
  const token = cfg.token;
  let stopped = false;
  let ws: WebSocket | null = null;
  let botUserId = "";
  let botName = "";
  let seq = 1;

  async function connectWs(): Promise<void> {
    const url = base.replace(/^http/, "ws") + "/api/v4/websocket";
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url);
      ws = socket;
      socket.addEventListener("open", () => {
        socket.send(
          JSON.stringify({
            seq: seq++,
            action: "authentication_challenge",
            data: { token },
          }),
        );
        resolve();
      });
      socket.addEventListener("error", () => reject(new Error("Mattermost WebSocket failed")), {
        once: true,
      });
      socket.addEventListener("message", (ev) => {
        try {
          const frame = JSON.parse(String(ev.data)) as {
            event?: string;
            data?: { post?: string; channel_type?: string };
          };
          if (frame.event !== "posted" || !frame.data?.post) return;
          const post = JSON.parse(frame.data.post) as {
            id?: string;
            user_id?: string;
            channel_id?: string;
            message?: string;
            props?: { from_bot?: string };
          };
          if (!post.channel_id || !post.user_id || post.user_id === botUserId) return;
          if (post.props?.from_bot === "true") return;
          const text = (post.message ?? "").trim();
          if (!text) return;
          const isGroup = frame.data.channel_type !== "D";
          const mentioned = !isGroup || text.includes(`@${botName}`) || text.includes(`@${botUserId}`);
          onMessage({
            chatId: post.channel_id,
            label: post.user_id,
            text: text.replace(new RegExp(`@${botName}\\b`, "gi"), "").trim() || text,
            isGroup,
            mentioned: isGroup ? mentioned : true,
          });
        } catch {
          /* ignore malformed frames */
        }
      });
      socket.addEventListener("close", () => {
        if (!stopped) setTimeout(() => void connectWs().catch(() => {}), 3_000);
      });
    });
  }

  return {
    async start() {
      const me = await jsonFetch<{ id: string; username: string }>(`${base}/api/v4/users/me`, {
        token,
      });
      botUserId = me.id;
      botName = me.username;
      await connectWs();
      return { botName: `@${me.username}` };
    },
    stop() {
      stopped = true;
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
      ws = null;
    },
    async send(chatId, text) {
      for (const part of chunkText(text, 4000)) {
        await jsonFetch(`${base}/api/v4/posts`, {
          method: "POST",
          token,
          body: JSON.stringify({ channel_id: chatId, message: part }),
        });
      }
    },
    async indicateTyping() {},
  };
}
