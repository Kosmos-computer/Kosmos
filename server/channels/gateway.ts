/**
 * Channel gateway — the supervisor that owns every configured channel's
 * lifecycle and routes messages between platforms and the agent loop.
 * Structurally the MCP supervisor's sibling: boot enabled channels in
 * parallel, isolate failures, expose status to Settings.
 *
 * Routing policy (the part adapters don't know about):
 *   - Unknown senders are never processed — they get a pairing code and the
 *     message stops there (OpenClaw's DM-pairing posture).
 *   - Group chats require an @mention (or reply-to-bot) when requireMention
 *     is enabled (default) — OpenClaw group mention gating.
 *   - Each approved chat maps to one persistent "channel" session (reminted
 *     when the peer's bound profile changes), so a conversation keeps its
 *     context across messages and restarts without bleeding across personas.
 *   - Peer → profile bindings (Settings) select which agent principal runs
 *     the turn; unbound peers use the registry default (builtin).
 *   - Turns per chat are serialized via sessionQueue; a second message queues
 *     behind the first rather than interleaving tool calls in one transcript.
 *   - Turns run headless (interactive: false): policy "confirm" degrades to
 *     deny, exactly like automations — nobody can answer a confirm card
 *     from Telegram (yet).
 */
import type { ChannelInfo, ChannelStatus } from "../../shared/types.js";
import { enqueueSession } from "../agent/sessionQueue.js";
import { pickTurnRunner, resolveAcpCommand, resolveTurnKind } from "../agent/turnRunner.js";
import { withProfileActivity } from "../agents/activity.js";
import { resolveChannelProfile } from "../agents/resolveProfile.js";
import { sessionStore } from "../stores/sessionStore.js";
import { channelStore, maskConfig } from "./channelStore.js";
import { createTelegramAdapter } from "./telegram.js";
import { createDiscordAdapter } from "./discord.js";

/** A normalized inbound message — everything routing needs, nothing more. */
export interface InboundMessage {
  chatId: string;
  /** Sender identity for pairing labels ("Paul (@paul)"). */
  label: string;
  text: string;
  /** True for Telegram group/supergroup chats. */
  isGroup?: boolean;
  /** True when the bot was @mentioned or the message replies to the bot. DMs always true. */
  mentioned?: boolean;
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

function entry(id: string): Entry {
  let e = entries.get(id);
  if (!e) {
    e = { status: "stopped" };
    entries.set(id, e);
  }
  return e;
}

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

  const cfg = channelStore.get(channelId);
  const requireMention = cfg?.requireMention !== false; // default true
  if (msg.isGroup && requireMention && !msg.mentioned) {
    // Quiet in groups until addressed — OpenClaw mention-gating posture.
    return;
  }

  const peer = channelStore.peers(channelId).find((p) => p.chatId === msg.chatId);
  const profile = resolveChannelProfile({ peerProfileId: peer?.profileId });

  let sessionId = channelStore.sessionFor(channelId, msg.chatId);
  const existing = sessionId ? await sessionStore.get(sessionId) : null;
  // Remint when missing, stale, or bound to a different profile (no transcript bleed).
  if (!existing || existing.profileId !== profile.id) {
    const session = await sessionStore.create(
      "channel",
      `✉ ${cfg?.name ?? channelId} · ${msg.label}`,
      { profileId: profile.id },
    );
    sessionId = session.id;
    channelStore.setSession(channelId, msg.chatId, sessionId);
  }

  if (!sessionId) return;

  const sid = sessionId;
  const surface =
    msg.isGroup
      ? `Inbound via ${cfg?.kind ?? "channel"} group${cfg?.requireMention !== false ? "; mention-gated" : ""}.`
      : `Inbound via ${cfg?.kind ?? "channel"} direct message.`;

  void enqueueSession(`channel:${channelId}:${msg.chatId}`, async () => {
    await adapter.indicateTyping(msg.chatId);
    let reply: string;
    try {
      const kind = resolveTurnKind(profile);
      const runner = pickTurnRunner(kind);
      reply = await withProfileActivity(profile.id, () =>
        runner({
          sessionId: sid,
          userMessage: msg.text,
          emit: () => {},
          profileId: profile.id,
          extraSystem: surface,
          ...(kind === "acp" ? { acpCommand: resolveAcpCommand(profile) } : {}),
        }),
      );
    } catch (err) {
      reply = `Something went wrong: ${err instanceof Error ? err.message : "agent turn failed"}`;
    }
    await adapter.send(msg.chatId, reply || "(no reply)").catch((err) => {
      console.warn(`[channels] send failed for ${channelId}:`, err);
    });
  });
}

function buildAdapter(channelId: string): ChannelAdapter {
  const cfg = channelStore.get(channelId);
  if (!cfg) throw new Error(`Channel not found: ${channelId}`);
  switch (cfg.kind) {
    case "telegram":
      return createTelegramAdapter(cfg.token, (msg) => void handleInbound(channelId, msg));
    case "discord":
      return createDiscordAdapter(cfg.token, (msg) => void handleInbound(channelId, msg));
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

function bootstrapFromEnv(): void {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return;
  if (channelStore.list().some((c) => c.kind === "telegram")) return;
  channelStore.add({ kind: "telegram", name: "Telegram", token });
  console.log("[channels] bootstrapped Telegram from TELEGRAM_BOT_TOKEN");
}

export const channelGateway = {
  async start(): Promise<void> {
    bootstrapFromEnv();
    await Promise.all(channelStore.list().filter((c) => c.enabled).map((c) => connect(c.id)));
    const running = [...entries.values()].filter((e) => e.status === "running").length;
    if (channelStore.list().length > 0) {
      console.log(`[channels] ${running}/${channelStore.list().length} channel(s) running`);
    }
  },

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
