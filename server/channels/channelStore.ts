/**
 * Channel persistence — configs, approved peers, pending pairings, and the
 * chat→session map, all in data/channels.json. Lifecycle (polling, retries,
 * status) lives in the gateway; this file only owns the records — the same
 * store/supervisor split as MCP servers.
 *
 * Bot tokens are secrets: API reads go through maskConfig() (last 4 chars
 * survive), and a masked token echoed back on update keeps the stored one —
 * the settings.json apiKey convention.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  ChannelConfig,
  ChannelKind,
  ChannelPeer,
  PendingPairing,
} from "../../shared/types.js";
import { dataDirs } from "../env.js";
import { writeSecureJson } from "../security/secureFs.js";

const FILE = path.join(dataDirs.root, "channels.json");

interface ChannelsFile {
  channels: ChannelConfig[];
  /** channelId → approved conversations. */
  peers: Record<string, ChannelPeer[]>;
  /** channelId → senders awaiting approval. */
  pairings: Record<string, PendingPairing[]>;
  /** "channelId:chatId" → sessionId, so a chat resumes its transcript. */
  chatSessions: Record<string, string>;
}

const EMPTY: ChannelsFile = { channels: [], peers: {}, pairings: {}, chatSessions: {} };

function load(): ChannelsFile {
  try {
    return { ...EMPTY, ...(JSON.parse(fs.readFileSync(FILE, "utf-8")) as Partial<ChannelsFile>) };
  } catch {
    return { ...EMPTY, peers: {}, pairings: {}, chatSessions: {} };
  }
}

function save(file: ChannelsFile): void {
  writeSecureJson(FILE, file);
}

/** name → url-safe slug (also used in the chat→session map keys). */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "channel"
  );
}

/** Token masked to its tail — enough for recognition, useless for auth. */
export function maskConfig(cfg: ChannelConfig): ChannelConfig {
  return { ...cfg, token: cfg.token ? `••••${cfg.token.slice(-4)}` : "" };
}

function chatKey(channelId: string, chatId: string): string {
  return `${channelId}:${chatId}`;
}

export const channelStore = {
  list(): ChannelConfig[] {
    return load().channels;
  },

  get(id: string): ChannelConfig | undefined {
    return load().channels.find((c) => c.id === id);
  },

  add(input: { kind: ChannelKind; name: string; token: string }): ChannelConfig {
    const file = load();
    let id = slugify(input.name);
    let n = 2;
    while (file.channels.some((c) => c.id === id)) id = `${slugify(input.name)}-${n++}`;
    const cfg: ChannelConfig = {
      id,
      kind: input.kind,
      name: input.name,
      token: input.token,
      enabled: true,
      addedAt: new Date().toISOString(),
    };
    file.channels.push(cfg);
    save(file);
    return cfg;
  },

  update(
    id: string,
    patch: Partial<Pick<ChannelConfig, "name" | "token" | "enabled">>,
  ): ChannelConfig | undefined {
    const file = load();
    const cfg = file.channels.find((c) => c.id === id);
    if (!cfg) return undefined;
    if (patch.name !== undefined) cfg.name = patch.name;
    // A mask echoed back from the Settings form must not clobber the secret.
    if (patch.token !== undefined && !patch.token.startsWith("••••")) cfg.token = patch.token;
    if (patch.enabled !== undefined) cfg.enabled = patch.enabled;
    save(file);
    return cfg;
  },

  remove(id: string): void {
    const file = load();
    file.channels = file.channels.filter((c) => c.id !== id);
    delete file.peers[id];
    delete file.pairings[id];
    for (const key of Object.keys(file.chatSessions)) {
      if (key.startsWith(`${id}:`)) delete file.chatSessions[key];
    }
    save(file);
  },

  // ── Peers (approved chats) ─────────────────────────────────────────────────

  peers(channelId: string): ChannelPeer[] {
    return load().peers[channelId] ?? [];
  },

  isApproved(channelId: string, chatId: string): boolean {
    return this.peers(channelId).some((p) => p.chatId === chatId);
  },

  removePeer(channelId: string, chatId: string): void {
    const file = load();
    file.peers[channelId] = (file.peers[channelId] ?? []).filter((p) => p.chatId !== chatId);
    delete file.chatSessions[chatKey(channelId, chatId)];
    save(file);
  },

  // ── Pairing (unknown-sender approval flow) ─────────────────────────────────

  pairings(channelId: string): PendingPairing[] {
    return load().pairings[channelId] ?? [];
  },

  /**
   * Register (or return the existing) pairing request for an unknown sender.
   * Idempotent per chat so repeat messages don't mint new codes.
   */
  requestPairing(channelId: string, chatId: string, label: string): PendingPairing {
    const file = load();
    const list = file.pairings[channelId] ?? [];
    const existing = list.find((p) => p.chatId === chatId);
    if (existing) return existing;
    const pairing: PendingPairing = {
      // 6 hex chars — human-comparable, not a security boundary (approval
      // happens in authenticated Settings, the code is just for matching).
      code: crypto.randomBytes(3).toString("hex").toUpperCase(),
      chatId,
      label,
      requestedAt: new Date().toISOString(),
    };
    list.push(pairing);
    file.pairings[channelId] = list;
    save(file);
    return pairing;
  },

  /** Approve (→ peer) or deny (→ drop) a pending pairing by its code. */
  resolvePairing(channelId: string, code: string, approve: boolean): ChannelPeer | null {
    const file = load();
    const list = file.pairings[channelId] ?? [];
    const idx = list.findIndex((p) => p.code === code);
    if (idx === -1) return null;
    const [pairing] = list.splice(idx, 1);
    file.pairings[channelId] = list;
    let peer: ChannelPeer | null = null;
    if (approve) {
      peer = { chatId: pairing.chatId, label: pairing.label, addedAt: new Date().toISOString() };
      file.peers[channelId] = [...(file.peers[channelId] ?? []), peer];
    }
    save(file);
    return peer;
  },

  // ── Chat → session map ─────────────────────────────────────────────────────

  sessionFor(channelId: string, chatId: string): string | undefined {
    return load().chatSessions[chatKey(channelId, chatId)];
  },

  setSession(channelId: string, chatId: string, sessionId: string): void {
    const file = load();
    file.chatSessions[chatKey(channelId, chatId)] = sessionId;
    save(file);
  },
};
