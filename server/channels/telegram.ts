/**
 * Telegram channel adapter — long polling against the Bot API with plain
 * fetch, no SDK. Long polling was chosen over webhooks deliberately: the
 * gateway stays reachable-from-nowhere (no public URL, no reverse proxy),
 * which matches Arco's self-hosted posture.
 *
 * The adapter knows nothing about sessions or pairing — it turns platform
 * updates into normalized inbound messages and sends text back. Routing
 * policy (including mention gating) lives in the gateway.
 */
import type { ChannelAdapter, InboundMessage } from "./gateway.js";

/** Telegram rejects messages over 4096 chars; long agent replies are split. */
const MAX_MESSAGE_CHARS = 4096;
/** Server-side long-poll hold time. The fetch timeout adds headroom on top. */
const POLL_TIMEOUT_S = 25;

interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TgMessageEntity {
  type: string;
  offset: number;
  length: number;
}

interface TgMessage {
  chat: { id: number; type: string; title?: string };
  from?: TgUser;
  text?: string;
  entities?: TgMessageEntity[];
  caption?: string;
  caption_entities?: TgMessageEntity[];
  reply_to_message?: { from?: TgUser };
}

interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}

/** "Paul Bloch (@paul)" — the label peers and pairings display in Settings. */
function describeSender(from: TgUser | undefined, chatTitle?: string): string {
  if (chatTitle) return chatTitle;
  if (!from) return "Unknown";
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ") || "Unknown";
  return from.username ? `${name} (@${from.username})` : name;
}

function isGroupChat(type: string): boolean {
  return type === "group" || type === "supergroup";
}

/**
 * True when the message @mentions `botUsername` (without @) or replies to the bot.
 * OpenClaw group mention-gating: quiet by default until addressed.
 */
export function messageMentionsBot(msg: TgMessage, botUsername: string | undefined): boolean {
  if (!botUsername) return false;
  const uname = botUsername.replace(/^@/, "").toLowerCase();
  if (msg.reply_to_message?.from?.username?.toLowerCase() === uname) return true;
  const text = msg.text ?? msg.caption ?? "";
  const entities = msg.entities ?? msg.caption_entities ?? [];
  for (const ent of entities) {
    if (ent.type !== "mention") continue;
    const slice = text.slice(ent.offset, ent.offset + ent.length).toLowerCase();
    if (slice === `@${uname}`) return true;
  }
  // Fallback: plain-text @bot when entities are missing
  return new RegExp(`(^|\\s)@${uname}\\b`, "i").test(text);
}

async function callApi<T>(
  token: string,
  method: string,
  params?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(params ? { body: JSON.stringify(params) } : {}),
    ...(signal ? { signal } : {}),
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description ?? res.status}`);
  return data.result as T;
}

/**
 * Create a Telegram adapter for one bot token. start() validates the token
 * via getMe before entering the poll loop, so a bad token surfaces as an
 * immediate error state instead of a silently dead channel.
 */
export function createTelegramAdapter(
  token: string,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const abort = new AbortController();
  let stopped = false;
  let botUsername: string | undefined;

  async function pollLoop(): Promise<void> {
    let offset = 0;
    while (!stopped) {
      try {
        const updates = await callApi<TgUpdate[]>(
          token,
          "getUpdates",
          { offset, timeout: POLL_TIMEOUT_S, allowed_updates: ["message"] },
          AbortSignal.any([abort.signal, AbortSignal.timeout((POLL_TIMEOUT_S + 10) * 1000)]),
        );
        for (const update of updates) {
          offset = Math.max(offset, update.update_id + 1);
          const msg = update.message;
          if (!msg?.text) continue; // text-only in v1 — media is future work
          const group = isGroupChat(msg.chat.type);
          onMessage({
            chatId: String(msg.chat.id),
            label: describeSender(msg.from, group ? msg.chat.title : undefined),
            text: msg.text,
            isGroup: group,
            mentioned: group ? messageMentionsBot(msg, botUsername) : true,
          });
        }
      } catch (err) {
        if (stopped || abort.signal.aborted) return;
        const isTimeout = err instanceof Error && err.name === "TimeoutError";
        if (!isTimeout) {
          console.warn("[telegram] poll error:", err instanceof Error ? err.message : err);
          await new Promise((r) => setTimeout(r, 5_000));
        }
      }
    }
  }

  return {
    async start() {
      const me = await callApi<TgUser>(token, "getMe", undefined, AbortSignal.timeout(10_000));
      botUsername = me.username;
      void pollLoop();
      return { botName: me.username ? `@${me.username}` : undefined };
    },

    stop() {
      stopped = true;
      abort.abort();
    },

    async send(chatId, text) {
      for (let i = 0; i < text.length; i += MAX_MESSAGE_CHARS) {
        await callApi(token, "sendMessage", {
          chat_id: Number(chatId),
          text: text.slice(i, i + MAX_MESSAGE_CHARS),
        });
      }
    },

    async indicateTyping(chatId) {
      await callApi(token, "sendChatAction", { chat_id: Number(chatId), action: "typing" }).catch(
        () => {},
      );
    },
  };
}
