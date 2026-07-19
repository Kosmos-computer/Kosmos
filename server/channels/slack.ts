/**
 * Slack channel adapter — Socket Mode over WebSocket so self-hosted instances
 * need no public Events URL (same posture as Telegram long-poll).
 *
 * Tokens: bot token (`xoxb-…`) for Web API; app-level token (`xapp-…`) with
 * `connections:write` for `apps.connections.open`.
 *
 * The adapter normalizes inbound text and can post Block Kit confirmations;
 * pairing, mention gating, and sessions live in the gateway.
 */
import type { ConfirmOption } from "../../shared/types.js";
import type { ChannelAdapter, InboundMessage } from "./gateway.js";

const MAX_MESSAGE_CHARS = 3000;
const SLACK_API = "https://slack.com/api";

interface SlackApiResult {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

interface SlackUser {
  id: string;
  name?: string;
  real_name?: string;
  profile?: { display_name?: string; real_name?: string };
}

interface SlackMessageEvent {
  type: string;
  user?: string;
  bot_id?: string;
  text?: string;
  channel?: string;
  channel_type?: string;
  thread_ts?: string;
  ts?: string;
  event_ts?: string;
  client_msg_id?: string;
  /** Present on message events that are replies. */
  parent_user_id?: string;
}

/** Exported for unit tests — true when the bot is addressed in a channel. */
export function slackMessageMentionsBot(
  text: string,
  botUserId: string | undefined,
  eventType: string,
): boolean {
  if (eventType === "app_mention") return true;
  if (!botUserId) return false;
  return text.includes(`<@${botUserId}>`);
}

/** Strip leading <@BOTID> mention so the agent sees the bare request. */
export function stripSlackBotMention(text: string, botUserId: string | undefined): string {
  if (!botUserId) return text.trim();
  return text.replace(new RegExp(`^\\s*<@${botUserId}>\\s*`, "i"), "").trim();
}

function isGroupChannel(channelType: string | undefined, channelId: string): boolean {
  if (channelType === "im" || channelType === "mpim") return channelType === "mpim";
  // Channel ids: C… public/private channels, D… DMs, G… groups/mpims
  if (channelId.startsWith("D")) return false;
  return true;
}

async function slackApi(
  botToken: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<SlackApiResult> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as SlackApiResult;
  if (!data.ok) throw new Error(`Slack ${method}: ${data.error ?? res.status}`);
  return data;
}

async function openSocketUrl(appToken: string): Promise<string> {
  const res = await fetch(`${SLACK_API}/apps.connections.open`, {
    method: "POST",
    headers: { Authorization: `Bearer ${appToken}` },
  });
  const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
  if (!data.ok || !data.url) {
    throw new Error(`Slack apps.connections.open: ${data.error ?? res.status}`);
  }
  return data.url;
}

function describeSender(user: SlackUser | undefined, userId: string, channelLabel?: string): string {
  if (channelLabel) return channelLabel;
  if (!user) return userId;
  const name =
    user.profile?.display_name ||
    user.profile?.real_name ||
    user.real_name ||
    user.name ||
    userId;
  return user.name && user.name !== name ? `${name} (@${user.name})` : name;
}

export interface SlackConfirmRequest {
  confirmId: string;
  command: string;
  options?: ConfirmOption[];
  /** Short code for /approve fallback text. */
  shortCode: string;
}

export interface SlackChannelAdapter extends ChannelAdapter {
  supportsConfirm: true;
  sendConfirm(chatId: string, req: SlackConfirmRequest): Promise<{ messageTs?: string }>;
  /** Update a previously posted confirm message after resolve. */
  resolveConfirmMessage(
    chatId: string,
    messageTs: string,
    approved: boolean,
  ): Promise<void>;
}

/**
 * Create a Slack Socket Mode adapter. `onInteractive` receives Block Kit
 * button clicks (already acknowledged on the wire).
 */
export function createSlackAdapter(
  botToken: string,
  appToken: string,
  onMessage: (msg: InboundMessage) => void,
  onInteractive?: (payload: {
    confirmId: string;
    decision: "once" | "session" | "always" | "deny";
    chatId: string;
    userId: string;
    messageTs?: string;
  }) => void,
): SlackChannelAdapter {
  let stopped = false;
  let ws: WebSocket | null = null;
  let botUserId: string | undefined;
  let botName: string | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  const userCache = new Map<string, SlackUser>();

  async function lookupUser(userId: string): Promise<SlackUser | undefined> {
    const hit = userCache.get(userId);
    if (hit) return hit;
    try {
      const data = await slackApi(botToken, "users.info", { user: userId });
      const user = data.user as SlackUser | undefined;
      if (user) userCache.set(userId, user);
      return user;
    } catch {
      return undefined;
    }
  }

  function ack(envelopeId: string): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ envelope_id: envelopeId }));
  }

  /** Dedup app_mention + message for the same Slack event (ts / client_msg_id). */
  const recentEventKeys = new Map<string, number>();
  function rememberEvent(key: string): boolean {
    const now = Date.now();
    for (const [k, t] of recentEventKeys) {
      if (now - t > 60_000) recentEventKeys.delete(k);
    }
    if (recentEventKeys.has(key)) return false;
    recentEventKeys.set(key, now);
    return true;
  }

  async function handleEventsApi(event: SlackMessageEvent): Promise<void> {
    if (!event.channel || !event.user) return;
    if (event.bot_id || event.user === botUserId) return;
    // Ignore message subtypes (edits, joins) except plain messages / app_mention
    const evType = event.type;
    if (evType !== "message" && evType !== "app_mention") return;
    // message_changed etc. arrive as type message with subtype — skip those
    if ("subtype" in event && (event as { subtype?: string }).subtype) return;

    const dedupeKey =
      event.client_msg_id ||
      (event.ts ? `${event.channel}:${event.ts}` : undefined) ||
      (event.event_ts ? `${event.channel}:${event.event_ts}` : undefined);
    if (dedupeKey && !rememberEvent(dedupeKey)) return;

    const raw = event.text ?? "";
    if (!raw.trim()) return;

    const group = isGroupChannel(event.channel_type, event.channel);
    const mentioned = group
      ? slackMessageMentionsBot(raw, botUserId, evType)
      : true;
    const text = stripSlackBotMention(raw, botUserId);
    if (!text) return;

    const user = await lookupUser(event.user);
    onMessage({
      chatId: event.channel,
      label: describeSender(user, event.user),
      text,
      isGroup: group,
      mentioned,
    });
  }

  function handleInteractive(payload: Record<string, unknown>): void {
    if (!onInteractive) return;
    if (payload.type !== "block_actions") return;
    const actions = payload.actions as Array<{ action_id?: string; value?: string }> | undefined;
    const action = actions?.[0];
    if (!action?.value || action.action_id !== "arco_confirm") return;
    let parsed: { confirmId?: string; decision?: string };
    try {
      parsed = JSON.parse(action.value) as { confirmId?: string; decision?: string };
    } catch {
      return;
    }
    const decision = parsed.decision;
    if (
      !parsed.confirmId ||
      (decision !== "once" &&
        decision !== "session" &&
        decision !== "always" &&
        decision !== "deny")
    ) {
      return;
    }
    const channel = payload.channel as { id?: string } | undefined;
    const user = payload.user as { id?: string } | undefined;
    const container = payload.container as { message_ts?: string } | undefined;
    const message = payload.message as { ts?: string } | undefined;
    if (!channel?.id || !user?.id) return;
    onInteractive({
      confirmId: parsed.confirmId,
      decision,
      chatId: channel.id,
      userId: user.id,
      messageTs: container?.message_ts ?? message?.ts,
    });
  }

  function handleEnvelope(raw: string): void {
    let envelope: {
      envelope_id?: string;
      type?: string;
      payload?: Record<string, unknown>;
      reason?: string;
    };
    try {
      envelope = JSON.parse(raw) as typeof envelope;
    } catch {
      return;
    }
    if (envelope.envelope_id) ack(envelope.envelope_id);
    if (envelope.type === "hello" || envelope.type === "disconnect") {
      if (envelope.type === "disconnect" && !stopped) scheduleReconnect();
      return;
    }
    if (envelope.type === "events_api" && envelope.payload) {
      const event = envelope.payload.event as SlackMessageEvent | undefined;
      if (event) void handleEventsApi(event);
      return;
    }
    if (envelope.type === "interactive" && envelope.payload) {
      handleInteractive(envelope.payload);
    }
  }

  function scheduleReconnect(): void {
    if (stopped || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      if (!stopped) void connectSocket().catch((err) => {
        console.warn("[slack] reconnect failed:", err instanceof Error ? err.message : err);
        scheduleReconnect();
      });
    }, 3_000);
  }

  async function connectSocket(): Promise<void> {
    if (stopped) return;
    if (ws) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      ws = null;
    }
    const url = await openSocketUrl(appToken);
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url);
      ws = socket;
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener(
        "error",
        () => reject(new Error("Slack Socket Mode WebSocket failed")),
        { once: true },
      );
      socket.addEventListener("message", (ev) => {
        handleEnvelope(String(ev.data));
      });
      socket.addEventListener("close", () => {
        if (!stopped) scheduleReconnect();
      });
    });
  }

  return {
    supportsConfirm: true,

    async start() {
      const auth = await slackApi(botToken, "auth.test");
      botUserId = typeof auth.user_id === "string" ? auth.user_id : undefined;
      botName = typeof auth.user === "string" ? `@${auth.user}` : undefined;
      await connectSocket();
      return { botName };
    },

    stop() {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
      ws = null;
    },

    async send(chatId, text) {
      for (let i = 0; i < text.length; i += MAX_MESSAGE_CHARS) {
        await slackApi(botToken, "chat.postMessage", {
          channel: chatId,
          text: text.slice(i, i + MAX_MESSAGE_CHARS),
        });
      }
    },

    async indicateTyping(chatId) {
      // Slack has no public typing API for bots in Socket Mode; best-effort noop.
      void chatId;
    },

    async sendConfirm(chatId, req) {
      const elements: Array<Record<string, unknown>> = [
        {
          type: "button",
          text: { type: "plain_text", text: "Allow once" },
          style: "primary",
          action_id: "arco_confirm",
          value: JSON.stringify({ confirmId: req.confirmId, decision: "once" }),
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Deny" },
          style: "danger",
          action_id: "arco_confirm",
          value: JSON.stringify({ confirmId: req.confirmId, decision: "deny" }),
        },
      ];
      if (req.options?.includes("session")) {
        elements.splice(1, 0, {
          type: "button",
          text: { type: "plain_text", text: "Allow this session" },
          action_id: "arco_confirm",
          value: JSON.stringify({ confirmId: req.confirmId, decision: "session" }),
        });
      }
      const commandPreview =
        req.command.length > 500 ? `${req.command.slice(0, 500)}…` : req.command;
      const posted = await slackApi(botToken, "chat.postMessage", {
        channel: chatId,
        text: `Approval needed (${req.shortCode}): ${commandPreview}\nReply \`/approve ${req.shortCode}\` or \`/deny ${req.shortCode}\`.`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Approval needed* (\`${req.shortCode}\`)\n\`\`\`${commandPreview.replace(/```/g, "`ˋ`")}\`\`\``,
            },
          },
          { type: "actions", block_id: `confirm_${req.confirmId}`, elements },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Or reply \`/approve ${req.shortCode}\` / \`/deny ${req.shortCode}\``,
              },
            ],
          },
        ],
      });
      return { messageTs: typeof posted.ts === "string" ? posted.ts : undefined };
    },

    async resolveConfirmMessage(chatId, messageTs, approved) {
      await slackApi(botToken, "chat.update", {
        channel: chatId,
        ts: messageTs,
        text: approved ? "Approved." : "Denied.",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: approved ? "*Approved.*" : "*Denied.*",
            },
          },
        ],
      }).catch(() => {});
    },
  };
}
