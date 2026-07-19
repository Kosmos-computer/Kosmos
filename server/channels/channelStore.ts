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

function maskSecret(value: string | undefined): string {
  if (!value) return "";
  return `••••${value.slice(-4)}`;
}

const SECRET_OPTION_KEYS = new Set([
  "password",
  "secret",
  "authToken",
  "signingSecret",
  "privateKey",
  "nsec",
]);

/** Token masked to its tail — enough for recognition, useless for auth. */
export function maskConfig(cfg: ChannelConfig): ChannelConfig {
  const options = cfg.options
    ? Object.fromEntries(
        Object.entries(cfg.options).map(([k, v]) => [
          k,
          SECRET_OPTION_KEYS.has(k) || /secret|password|token|key/i.test(k)
            ? maskSecret(v)
            : v,
        ]),
      )
    : undefined;
  return {
    ...cfg,
    token: maskSecret(cfg.token),
    ...(cfg.appToken ? { appToken: maskSecret(cfg.appToken) } : {}),
    ...(options ? { options } : {}),
  };
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

  add(input: {
    kind: ChannelKind;
    name: string;
    token: string;
    appToken?: string;
    options?: Record<string, string>;
  }): ChannelConfig {
    const file = load();
    let id = slugify(input.name);
    let n = 2;
    while (file.channels.some((c) => c.id === id)) id = `${slugify(input.name)}-${n++}`;
    const cfg: ChannelConfig = {
      id,
      kind: input.kind,
      name: input.name,
      token: input.token,
      ...(input.appToken?.trim() ? { appToken: input.appToken.trim() } : {}),
      ...(input.options && Object.keys(input.options).length
        ? { options: { ...input.options } }
        : {}),
      enabled: true,
      addedAt: new Date().toISOString(),
      requireMention: true,
    };
    file.channels.push(cfg);
    save(file);
    return cfg;
  },

  update(
    id: string,
    patch: Partial<
      Pick<
        ChannelConfig,
        "name" | "token" | "appToken" | "options" | "enabled" | "requireMention"
      >
    >,
  ): ChannelConfig | undefined {
    const file = load();
    const cfg = file.channels.find((c) => c.id === id);
    if (!cfg) return undefined;
    if (patch.name !== undefined) cfg.name = patch.name;
    // A mask echoed back from the Settings form must not clobber the secret.
    if (patch.token !== undefined && !patch.token.startsWith("••••")) cfg.token = patch.token;
    if (patch.appToken !== undefined) {
      if (!patch.appToken) delete cfg.appToken;
      else if (!patch.appToken.startsWith("••••")) cfg.appToken = patch.appToken;
    }
    if (patch.options !== undefined) {
      const merged = { ...(cfg.options ?? {}) };
      for (const [k, v] of Object.entries(patch.options)) {
        if (v.startsWith("••••")) continue;
        if (!v) delete merged[k];
        else merged[k] = v;
      }
      cfg.options = Object.keys(merged).length ? merged : undefined;
    }
    if (patch.enabled !== undefined) cfg.enabled = patch.enabled;
    if (patch.requireMention !== undefined) cfg.requireMention = patch.requireMention;
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

  /**
   * Patch an approved peer (e.g. bind a profile). Changing profileId clears the
   * chat→session map entry so the next message mints a fresh transcript under
   * the new principal (no bleed across personas).
   */
  updatePeer(
    channelId: string,
    chatId: string,
    patch: { profileId?: string | null },
  ): ChannelPeer | undefined {
    const file = load();
    const list = file.peers[channelId] ?? [];
    const peer = list.find((p) => p.chatId === chatId);
    if (!peer) return undefined;
    if ("profileId" in patch) {
      const next = patch.profileId ?? null;
      const prev = peer.profileId ?? null;
      peer.profileId = next;
      if (prev !== next) {
        delete file.chatSessions[chatKey(channelId, chatId)];
      }
    }
    save(file);
    return peer;
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
      const existing = file.peers[channelId] ?? [];
      // First approved peer becomes the channel owner (OpenClaw first-approver bootstrap).
      const isFirst = existing.length === 0;
      peer = {
        chatId: pairing.chatId,
        label: pairing.label,
        addedAt: new Date().toISOString(),
        ...(isFirst ? { owner: true } : {}),
      };
      file.peers[channelId] = [...existing, peer];
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
