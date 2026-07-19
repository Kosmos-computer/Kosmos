/**
 * QQ Bot — Gateway WS + REST send (OpenClaw qqbot engine protocol, thin port).
 */
import type { ChannelConfig } from "../../../shared/types.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { chunkText, jsonFetch, opt } from "./httpUtil.js";

const API = "https://api.sgroup.qq.com";

export function createQqbotAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const appId = opt(cfg, "appId");
  const secret = cfg.token.trim();
  if (!appId || !secret) throw new Error("QQ Bot requires options.appId and App Secret (token)");
  let stopped = false;
  let accessToken = "";
  let tokenExp = 0;
  let ws: WebSocket | null = null;
  let botUser = "qqbot";

  async function mintToken(): Promise<string> {
    if (accessToken && Date.now() < tokenExp) return accessToken;
    const data = await jsonFetch<{ access_token?: string; expires_in?: number }>(
      "https://bots.qq.com/app/getAppAccessToken",
      {
        method: "POST",
        body: JSON.stringify({ appId, clientSecret: secret }),
      },
    );
    if (!data.access_token) throw new Error("QQ token mint failed");
    accessToken = data.access_token;
    tokenExp = Date.now() + Math.max(60, (data.expires_in ?? 7200) - 120) * 1000;
    return accessToken;
  }

  async function connectLoop(): Promise<void> {
    while (!stopped) {
      try {
        const token = await mintToken();
        const gw = await jsonFetch<{ url?: string }>(`${API}/gateway`, {
          headers: { Authorization: `QQBot ${token}` },
        });
        if (!gw.url) throw new Error("no gateway url");
        await new Promise<void>((resolve) => {
          const socket = new WebSocket(gw.url!);
          ws = socket;
          let hb: ReturnType<typeof setInterval> | undefined;
          socket.addEventListener("open", () => {
            console.log("[qqbot] gateway connected");
          });
          socket.addEventListener("message", (ev) => {
            try {
              const frame = JSON.parse(String(ev.data)) as {
                op?: number;
                t?: string;
                s?: number;
                d?: Record<string, unknown>;
              };
              if (frame.op === 10) {
                // Hello → Identify
                const interval = Number((frame.d as { heartbeat_interval?: number })?.heartbeat_interval) || 41250;
                socket.send(
                  JSON.stringify({
                    op: 2,
                    d: {
                      token: `QQBot ${accessToken}`,
                      intents: (1 << 25) | (1 << 30) | (1 << 12), // public guild messages / group / C2C approx
                      shard: [0, 1],
                    },
                  }),
                );
                hb = setInterval(() => {
                  socket.send(JSON.stringify({ op: 1, d: frame.s ?? null }));
                }, interval);
              }
              if (frame.t === "READY") {
                const user = frame.d?.user as { username?: string; id?: string } | undefined;
                botUser = user?.username || user?.id || "qqbot";
              }
              if (
                frame.t === "C2C_MESSAGE_CREATE" ||
                frame.t === "GROUP_AT_MESSAGE_CREATE" ||
                frame.t === "AT_MESSAGE_CREATE" ||
                frame.t === "MESSAGE_CREATE"
              ) {
                const d = frame.d as {
                  content?: string;
                  author?: { id?: string; username?: string };
                  channel_id?: string;
                  group_openid?: string;
                  id?: string;
                };
                const text = (d.content ?? "").replace(/<@!\d+>/g, "").trim();
                const chatId = d.group_openid || d.channel_id || d.author?.id;
                if (!text || !chatId) return;
                onMessage({
                  chatId: String(chatId),
                  label: d.author?.username || d.author?.id || chatId,
                  text,
                  isGroup: Boolean(d.group_openid || d.channel_id),
                  mentioned: true,
                });
              }
            } catch {
              /* ignore */
            }
          });
          socket.addEventListener("close", () => {
            if (hb) clearInterval(hb);
            ws = null;
            resolve();
          });
          socket.addEventListener("error", () => {
            /* close follows */
          });
        });
      } catch (err) {
        console.warn("[qqbot] ws:", err instanceof Error ? err.message : err);
      }
      if (!stopped) await new Promise((r) => setTimeout(r, 3_000));
    }
  }

  return {
    async start() {
      await mintToken();
      void connectLoop();
      return { botName: botUser };
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
      const token = await mintToken();
      for (const part of chunkText(text, 2000)) {
        // Prefer group openid path; fall back to channel / users
        const attempts = [
          `${API}/v2/groups/${encodeURIComponent(chatId)}/messages`,
          `${API}/channels/${encodeURIComponent(chatId)}/messages`,
          `${API}/v2/users/${encodeURIComponent(chatId)}/messages`,
        ];
        let lastErr: unknown;
        for (const url of attempts) {
          try {
            await jsonFetch(url, {
              method: "POST",
              headers: { Authorization: `QQBot ${token}` },
              body: JSON.stringify({ content: part, msg_type: 0 }),
            });
            lastErr = null;
            break;
          } catch (err) {
            lastErr = err;
          }
        }
        if (lastErr) throw lastErr;
      }
    },
    async indicateTyping() {},
  };
}
