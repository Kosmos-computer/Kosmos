/**
 * Telegram channel adapter — long polling against the Bot API with plain
 * fetch, no SDK. Long polling was chosen over webhooks deliberately: the
 * gateway stays reachable-from-nowhere (no public URL, no reverse proxy),
 * which matches Arco's self-hosted posture.
 *
 * The adapter knows nothing about sessions or pairing — it turns platform
 * updates into normalized inbound messages and sends text back. Routing
 * policy lives in the gateway.
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

interface TgUpdate {
  update_id: number;
  message?: {
    chat: { id: number; type: string; title?: string };
    from?: TgUser;
    text?: string;
  };
}

/** "Paul Bloch (@paul)" — the label peers and pairings display in Settings. */
function describeSender(from: TgUser | undefined, chatTitle?: string): string {
  if (chatTitle) return chatTitle;
  if (!from) return "Unknown";
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ") || "Unknown";
  return from.username ? `${name} (@${from.username})` : name;
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

  // ── Poll loop ──────────────────────────────────────────────────────────────
  //
  // offset = last update_id + 1 acknowledges processed updates server-side,
  // so a restart never replays old messages. Errors back off 5s and retry —
  // transient network failures must not kill the channel.

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
          onMessage({
            chatId: String(msg.chat.id),
            label: describeSender(msg.from, msg.chat.type === "private" ? undefined : msg.chat.title),
            text: msg.text,
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
      void pollLoop();
      return { botName: me.username ? `@${me.username}` : undefined };
    },

    stop() {
      stopped = true;
      abort.abort();
    },

    async send(chatId, text) {
      // "typing…" indicators are handled by the gateway before the turn;
      // here we only chunk and deliver the final text.
      for (let i = 0; i < text.length; i += MAX_MESSAGE_CHARS) {
        await callApi(token, "sendMessage", {
          chat_id: Number(chatId),
          text: text.slice(i, i + MAX_MESSAGE_CHARS),
        });
      }
    },

    async indicateTyping(chatId) {
      await callApi(token, "sendChatAction", { chat_id: Number(chatId), action: "typing" }).catch(
        () => {}, // cosmetic — never let a failed indicator affect the turn
      );
    },
  };
}
