/**
 * Tlon / Urbit — SSE + poke send (OpenClaw tlon/urbit transport).
 */
import type { ChannelConfig } from "../../../shared/types.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { chunkText, opt } from "./httpUtil.js";

export function createTlonAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const shipUrl = opt(cfg, "baseUrl").replace(/\/+$/, "");
  const code = cfg.token.trim(); // login code / cookie
  if (!shipUrl || !code) throw new Error("Tlon requires ship URL (baseUrl) and login code (token)");
  let stopped = false;
  let cookie = "";
  let ship = opt(cfg, "ship"); // ~zod

  async function login(): Promise<void> {
    const res = await fetch(`${shipUrl}/~/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ password: code }),
      redirect: "manual",
    });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
    if (!cookie) {
      const h = res.headers.get("set-cookie");
      if (h) cookie = h.split(";")[0];
    }
    if (!cookie) throw new Error(`Urbit login failed (${res.status})`);
    if (!ship) {
      // try whoami scry
      ship = new URL(shipUrl).hostname.split(".")[0] || "ship";
      if (!ship.startsWith("~")) ship = `~${ship}`;
    }
  }

  async function pollSse(): Promise<void> {
    // Channel subscription via PUT open + SSE — simplified OpenClaw sse-client loop
    while (!stopped) {
      try {
        const channelPath = `/~/channel/kosmos-${Date.now()}`;
        await fetch(`${shipUrl}${channelPath}`, {
          method: "PUT",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        // Subscribe to chat
        await fetch(`${shipUrl}${channelPath}`, {
          method: "PUT",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify([
            {
              id: 1,
              action: "subscribe",
              ship: ship.replace(/^~/, ""),
              app: "chat",
              path: "/",
            },
          ]),
        });
        const res = await fetch(`${shipUrl}${channelPath}`, {
          headers: { Cookie: cookie, Accept: "text/event-stream" },
        });
        if (!res.ok || !res.body) throw new Error(`SSE ${res.status}`);
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";
          for (const block of parts) {
            const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            try {
              const json = JSON.parse(dataLine.slice(5).trim()) as {
                json?: { essay?: { content?: unknown[]; author?: string }; id?: string };
                response?: string;
              };
              const essay = json.json?.essay;
              if (!essay?.content) continue;
              const text = essay.content
                .map((c) => {
                  if (typeof c === "string") return c;
                  if (c && typeof c === "object" && "inline" in c) {
                    const inl = (c as { inline?: unknown[] }).inline ?? [];
                    return inl.map((x) => (typeof x === "string" ? x : "")).join("");
                  }
                  return "";
                })
                .join("")
                .trim();
              if (!text) continue;
              const chatId = String(json.json?.id || "tlon");
              onMessage({
                chatId,
                label: essay.author || ship,
                text,
                isGroup: true,
                mentioned: true,
              });
            } catch {
              /* ignore frame */
            }
          }
        }
      } catch (err) {
        if (stopped) return;
        console.warn("[tlon] sse:", err instanceof Error ? err.message : err);
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }
  }

  return {
    async start() {
      await login();
      void pollSse();
      return { botName: ship };
    },
    stop() {
      stopped = true;
    },
    async send(chatId, text) {
      // Best-effort poke — story format simplified
      for (const part of chunkText(text, 2000)) {
        const channelPath = `/~/channel/kosmos-send-${Date.now()}`;
        await fetch(`${shipUrl}${channelPath}`, {
          method: "PUT",
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          body: JSON.stringify([
            {
              id: Date.now(),
              action: "poke",
              ship: ship.replace(/^~/, ""),
              app: "chat",
              mark: "chat-action-1",
              json: {
                id: chatId,
                action: { post: { essay: { content: [part], author: ship } } },
              },
            },
          ]),
        });
      }
    },
    async indicateTyping() {},
  };
}
