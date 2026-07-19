/**
 * Nostr NIP-04 DMs via nostr-tools (same stack OpenClaw uses).
 */
import type { ChannelConfig } from "../../../shared/types.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { opt } from "./httpUtil.js";

const DEFAULT_RELAYS = ["wss://relay.damus.io", "wss://nos.lol"];

function normalizeSk(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("nsec1")) return t;
  if (/^[0-9a-fA-F]{64}$/.test(t)) return t.toLowerCase();
  throw new Error("Nostr token must be nsec… or 64-char hex private key");
}

export function createNostrAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const skInput = normalizeSk(cfg.token);
  const relays = (opt(cfg, "relays") || DEFAULT_RELAYS.join(","))
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pool: any = null;
  let stopped = false;
  let sk: Uint8Array;
  let pk: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tools: any;
  const seen = new Set<string>();

  return {
    async start() {
      tools = await import("nostr-tools");
      const nip04 = await import("nostr-tools/nip04");
      const { SimplePool, getPublicKey, verifyEvent, nip19 } = tools;
      if (skInput.startsWith("nsec")) {
        const decoded = nip19.decode(skInput);
        if (decoded.type !== "nsec") throw new Error("invalid nsec");
        sk = decoded.data as Uint8Array;
      } else {
        sk = Uint8Array.from(Buffer.from(skInput, "hex"));
      }
      pk = getPublicKey(sk);
      pool = new SimplePool();
      const since = Math.floor(Date.now() / 1000) - 120;
      const sub = pool.subscribeMany(
        relays,
        { kinds: [4], "#p": [pk], since },
        {
          onevent: async (ev: {
            id: string;
            pubkey: string;
            content: string;
            created_at: number;
          }) => {
            if (stopped) return;
            if (seen.has(ev.id)) return;
            seen.add(ev.id);
            if (seen.size > 5000) {
              const drop = [...seen].slice(0, 1000);
              for (const id of drop) seen.delete(id);
            }
            if (!verifyEvent(ev)) return;
            if (ev.pubkey === pk) return;
            try {
              const text = (await nip04.decrypt(sk, ev.pubkey, ev.content)).trim();
              if (!text) return;
              onMessage({
                chatId: ev.pubkey,
                label: ev.pubkey.slice(0, 12),
                text,
                isGroup: false,
                mentioned: true,
              });
            } catch (err) {
              console.warn(
                "[nostr] decrypt:",
                err instanceof Error ? err.message : err,
              );
            }
          },
        },
      );
      // keep sub alive until stop
      (pool as { __sub?: { close: () => void } }).__sub = sub;
      console.log(`[nostr] listening on ${relays.length} relay(s) as ${pk.slice(0, 12)}…`);
      return { botName: `npub:${pk.slice(0, 12)}` };
    },
    stop() {
      stopped = true;
      try {
        (pool as { __sub?: { close: () => void } })?.__sub?.close();
        pool?.close?.(relays);
      } catch {
        /* ignore */
      }
      pool = null;
    },
    async send(chatId, text) {
      if (!pool || !tools) throw new Error("Nostr not connected");
      const nip04 = await import("nostr-tools/nip04");
      const { finalizeEvent } = tools;
      const content = await nip04.encrypt(sk, chatId, text.slice(0, 4000));
      const event = finalizeEvent(
        {
          kind: 4,
          created_at: Math.floor(Date.now() / 1000),
          tags: [["p", chatId]],
          content,
        },
        sk,
      );
      await Promise.any(pool.publish(relays, event));
    },
    async indicateTyping() {},
  };
}
