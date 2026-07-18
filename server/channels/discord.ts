/**
 * Discord channel adapter — Gateway WebSocket + REST, no SDK.
 * Same ChannelAdapter contract as Telegram; pairing / mention gating live
 * in the gateway.
 */
import type { ChannelAdapter, InboundMessage } from "./gateway.js";

const API = "https://discord.com/api/v10";
const GATEWAY = "wss://gateway.discord.gg/?v=10&encoding=json";
/** Guild messages + DMs + message content (privileged) intent bits. */
const INTENTS = (1 << 9) | (1 << 12) | (1 << 15);

interface DiscordUser {
  id: string;
  username?: string;
  global_name?: string | null;
  bot?: boolean;
}

interface DiscordMessage {
  id: string;
  channel_id: string;
  guild_id?: string;
  author: DiscordUser;
  content: string;
  mentions?: DiscordUser[];
  referenced_message?: { author?: DiscordUser } | null;
}

function describeSender(user: DiscordUser): string {
  const name = user.global_name || user.username || "Unknown";
  return user.username ? `${name} (@${user.username})` : name;
}

async function rest<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "ArcoOS-Channels (https://arco.os, 1.0)",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Discord ${method} ${path}: ${res.status} ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function createDiscordAdapter(
  token: string,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  let ws: WebSocket | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let seq: number | null = null;
  let botId: string | undefined;
  let botUsername: string | undefined;
  let stopped = false;
  let resumeUrl: string | undefined;
  let sessionId: string | undefined;

  const clearHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const sendGateway = (op: number, d: unknown) => {
    ws?.send(JSON.stringify({ op, d }));
  };

  const handleDispatch = (t: string, d: unknown) => {
    if (t === "READY") {
      const ready = d as {
        user: DiscordUser;
        session_id: string;
        resume_gateway_url?: string;
      };
      botId = ready.user.id;
      botUsername = ready.user.username;
      sessionId = ready.session_id;
      if (ready.resume_gateway_url) resumeUrl = ready.resume_gateway_url;
      return;
    }
    if (t !== "MESSAGE_CREATE") return;
    const msg = d as DiscordMessage;
    if (!msg?.author || msg.author.bot) return;
    if (msg.author.id === botId) return;

    const isGroup = Boolean(msg.guild_id);
    const mentioned =
      !isGroup ||
      (msg.mentions?.some((u) => u.id === botId) ?? false) ||
      msg.referenced_message?.author?.id === botId ||
      (botUsername
        ? new RegExp(`(^|\\s)@${botUsername}\\b`, "i").test(msg.content)
        : false);

    // Strip bot mention from content for cleaner agent input.
    let text = msg.content ?? "";
    if (botId) {
      text = text.replace(new RegExp(`<@!?${botId}>`, "g"), "").trim();
    }
    if (!text) return;

    onMessage({
      chatId: msg.channel_id,
      label: describeSender(msg.author),
      text,
      isGroup,
      mentioned: isGroup ? mentioned : true,
    });
  };

  const connect = () => {
    if (stopped) return;
    const url = resumeUrl ?? GATEWAY;
    ws = new WebSocket(url);

    ws.addEventListener("open", () => {
      // Identify or resume after HELLO.
    });

    ws.addEventListener("message", (ev) => {
      let payload: { op: number; d?: unknown; s?: number | null; t?: string | null };
      try {
        payload = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (payload.s != null) seq = payload.s;

      switch (payload.op) {
        case 10: {
          // Hello
          const interval = (payload.d as { heartbeat_interval: number }).heartbeat_interval;
          clearHeartbeat();
          heartbeatTimer = setInterval(() => sendGateway(1, seq), interval);
          if (sessionId && resumeUrl && seq != null) {
            sendGateway(6, { token, session_id: sessionId, seq });
          } else {
            sendGateway(2, {
              token,
              intents: INTENTS,
              properties: { os: "arco", browser: "arco", device: "arco" },
            });
          }
          break;
        }
        case 0:
          if (payload.t) handleDispatch(payload.t, payload.d);
          break;
        case 7:
          // Reconnect
          ws?.close();
          break;
        case 9:
          // Invalid session
          sessionId = undefined;
          setTimeout(connect, 2000);
          break;
        default:
          break;
      }
    });

    ws.addEventListener("close", () => {
      clearHeartbeat();
      ws = null;
      if (!stopped) setTimeout(connect, 3000);
    });

    ws.addEventListener("error", () => {
      ws?.close();
    });
  };

  return {
    async start() {
      stopped = false;
      const me = await rest<DiscordUser>(token, "GET", "/users/@me");
      botId = me.id;
      botUsername = me.username;
      connect();
      return { botName: me.username ? `@${me.username}` : undefined };
    },
    stop() {
      stopped = true;
      clearHeartbeat();
      ws?.close();
      ws = null;
    },
    async send(chatId, text) {
      // Discord message limit 2000 chars — split like Telegram.
      const chunks: string[] = [];
      let restText = text;
      while (restText.length > 2000) {
        chunks.push(restText.slice(0, 2000));
        restText = restText.slice(2000);
      }
      if (restText) chunks.push(restText);
      for (const content of chunks) {
        await rest(token, "POST", `/channels/${chatId}/messages`, { content });
      }
    },
    async indicateTyping(chatId) {
      await rest(token, "POST", `/channels/${chatId}/typing`).catch(() => {});
    },
  };
}
