/**
 * Channel gateway — the supervisor that owns every configured channel's
 * lifecycle and routes messages between platforms and the agent loop.
 * Structurally the MCP supervisor's sibling: boot enabled channels in
 * parallel, isolate failures, expose status to Settings.
 *
 * Routing policy (the part adapters don't know about):
 *   - Unknown senders are never processed — they get a pairing code and the
 *     message stops there (OpenClaw's DM-pairing posture).
 *   - Each approved chat maps to one persistent "channel" session, so a
 *     conversation keeps its context across messages and restarts.
 *   - Turns per chat are serialized; a second message queues behind the
 *     first rather than interleaving tool calls in one transcript.
 *   - Turns run headless (interactive: false): policy "confirm" degrades to
 *     deny, exactly like automations — nobody can answer a confirm card
 *     from Telegram (yet).
 */
import type { ChannelInfo, ChannelStatus } from "../../shared/types.js";
import { runAgentTurn } from "../agent/loop.js";
import { sessionStore } from "../stores/sessionStore.js";
import { channelStore, maskConfig } from "./channelStore.js";
import { createTelegramAdapter } from "./telegram.js";

/** A normalized inbound message — everything routing needs, nothing more. */
export interface InboundMessage {
  chatId: string;
  /** Sender identity for pairing labels ("Paul (@paul)"). */
  label: string;
  text: string;
}

/** What every platform adapter must provide. Kept minimal on purpose. */
export interface ChannelAdapter {
  /** Validate credentials and begin receiving. Throws on bad config. */
  start(): Promise<{ botName?: string }>;
  stop(): void;
  send(chatId: string, text: string): Promise<void>;
  /** Best-effort "typing…" hint while the agent works. */
  indicateTyping(chatId: string): Promise<void>;
}

interface Entry {
  status: ChannelStatus;
  adapter?: ChannelAdapter;
  error?: string;
  botName?: string;
}

const entries = new Map<string, Entry>();

/** Per-chat turn serialization: chain each task onto the chat's tail. */
const chatQueues = new Map<string, Promise<void>>();

function enqueue(key: string, task: () => Promise<void>): void {
  const tail = (chatQueues.get(key) ?? Promise.resolve()).then(task).catch(() => {});
  chatQueues.set(key, tail);
}

function entry(id: string): Entry {
  let e = entries.get(id);
  if (!e) {
    e = { status: "stopped" };
    entries.set(id, e);
  }
  return e;
}

// ---------------------------------------------------------------------------
// Inbound routing
//
// Pairing gate first, then session resolution, then the agent turn. The
// reply is whatever final text the loop produced — tool traffic stays in
// the transcript, only the answer travels back to the platform.
// ---------------------------------------------------------------------------

const PAIRING_REPLY = (code: string) =>
  `This assistant is private. Your pairing request (code ${code}) is waiting for approval — ` +
  `the owner can accept it in Settings → Channels.`;

async function handleInbound(channelId: string, msg: InboundMessage): Promise<void> {
  const e = entries.get(channelId);
  const adapter = e?.adapter;
  if (!adapter) return;

  if (!channelStore.isApproved(channelId, msg.chatId)) {
    const pairing = channelStore.requestPairing(channelId, msg.chatId, msg.label);
    await adapter.send(msg.chatId, PAIRING_REPLY(pairing.code)).catch(() => {});
    return;
  }

  // One durable session per chat — recreate it if the user deleted the old
  // transcript, and persist the mapping so restarts resume the conversation.
  let sessionId = channelStore.sessionFor(channelId, msg.chatId);
  if (!sessionId || !(await sessionStore.get(sessionId))) {
    const cfg = channelStore.get(channelId);
    const session = await sessionStore.create("channel", `✉ ${cfg?.name ?? channelId} · ${msg.label}`);
    sessionId = session.id;
    channelStore.setSession(channelId, msg.chatId, sessionId);
  }

  const sid = sessionId;
  enqueue(`${channelId}:${msg.chatId}`, async () => {
    await adapter.indicateTyping(msg.chatId);
    let reply: string;
    try {
      reply = await runAgentTurn({
        sessionId: sid,
        userMessage: msg.text,
        emit: () => {}, // headless — no shell client attached
      });
    } catch (err) {
      reply = `Something went wrong: ${err instanceof Error ? err.message : "agent turn failed"}`;
    }
    await adapter.send(msg.chatId, reply || "(no reply)").catch((err) => {
      console.warn(`[channels] send failed for ${channelId}:`, err);
    });
  });
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

function buildAdapter(channelId: string): ChannelAdapter {
  const cfg = channelStore.get(channelId);
  if (!cfg) throw new Error(`Channel not found: ${channelId}`);
  // kind is a union of one today; the switch is where Discord etc. join.
  switch (cfg.kind) {
    case "telegram":
      return createTelegramAdapter(cfg.token, (msg) => void handleInbound(channelId, msg));
  }
}

async function connect(id: string): Promise<void> {
  const cfg = channelStore.get(id);
  if (!cfg || !cfg.enabled) return;
  const e = entry(id);
  e.status = "connecting";
  try {
    const adapter = buildAdapter(id);
    const { botName } = await adapter.start();
    e.adapter = adapter;
    e.botName = botName;
    e.status = "running";
    e.error = undefined;
  } catch (err) {
    e.adapter = undefined;
    e.status = "error";
    e.error = err instanceof Error ? err.message : "Connect failed";
  }
}

function disconnect(id: string): void {
  const e = entries.get(id);
  if (!e) return;
  e.adapter?.stop();
  e.adapter = undefined;
  e.status = "stopped";
  e.error = undefined;
}

export const channelGateway = {
  /** Boot: start every enabled channel in parallel, failures isolated. */
  async start(): Promise<void> {
    await Promise.all(channelStore.list().filter((c) => c.enabled).map((c) => connect(c.id)));
    const running = [...entries.values()].filter((e) => e.status === "running").length;
    if (channelStore.list().length > 0) {
      console.log(`[channels] ${running}/${channelStore.list().length} channel(s) running`);
    }
  },

  /** Reconcile one channel with its stored config (after add/edit/toggle). */
  async sync(id: string): Promise<void> {
    disconnect(id);
    if (channelStore.get(id)?.enabled) await connect(id);
  },

  async restart(id: string): Promise<void> {
    disconnect(id);
    await connect(id);
  },

  remove(id: string): void {
    disconnect(id);
    entries.delete(id);
  },

  /**
   * Outbound send to an approved chat — the delivery path automations and
   * the channel_send tool share. Refusing unapproved chats here (not just at
   * inbound) keeps the allowlist authoritative in both directions.
   */
  async send(channelId: string, chatId: string, text: string): Promise<void> {
    const e = entries.get(channelId);
    if (!e?.adapter || e.status !== "running") {
      throw new Error(`Channel not running: ${channelId}`);
    }
    if (!channelStore.isApproved(channelId, chatId)) {
      throw new Error(`Chat ${chatId} is not an approved peer of channel ${channelId}`);
    }
    await e.adapter.send(chatId, text);
  },

  /** Everything the Settings panel needs, token masked. */
  list(): ChannelInfo[] {
    return channelStore.list().map((cfg) => {
      const e = entries.get(cfg.id);
      return {
        config: maskConfig(cfg),
        status: e?.status ?? "stopped",
        ...(e?.error ? { error: e.error } : {}),
        ...(e?.botName ? { botName: e.botName } : {}),
        peers: channelStore.peers(cfg.id),
        pairings: channelStore.pairings(cfg.id),
      };
    });
  },
};
