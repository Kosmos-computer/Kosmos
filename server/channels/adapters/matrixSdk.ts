/**
 * Matrix adapter via matrix-js-sdk + Rust crypto (OpenClaw dependency stack).
 * Uses WASM crypto on Node < 24; optional encryption via options.encryption=true.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { ChannelConfig } from "../../../shared/types.js";
import { dataDirs } from "../../env.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { chunkText, opt } from "./httpUtil.js";

export function createMatrixSdkAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const base = opt(cfg, "baseUrl").replace(/\/+$/, "");
  const token = cfg.token;
  let userId = opt(cfg, "userId");
  if (!base || !token) throw new Error("Matrix requires token and options.baseUrl");
  const encryption = opt(cfg, "encryption", "false") === "true";
  const cryptoDir = path.join(
    dataDirs.root,
    "matrix-crypto",
    createHash("sha256").update(`${base}\0${token.slice(0, 12)}`).digest("hex").slice(0, 16),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let client: any = null;
  let stopped = false;
  let live = false;

  return {
    async start() {
      if (encryption) {
        await import("fake-indexeddb/auto");
      }
      const sdk = await import("matrix-js-sdk");
      const createClient = sdk.createClient ?? sdk.default?.createClient;
      if (!userId) {
        // whoami via temp client
        const tmp = createClient({ baseUrl: base, accessToken: token });
        const who = await tmp.whoami();
        userId = who.user_id;
        tmp.stopClient();
      }

      fs.mkdirSync(cryptoDir, { recursive: true });
      client = createClient({
        baseUrl: base,
        accessToken: token,
        userId,
        deviceId: opt(cfg, "deviceId") || undefined,
      });

      if (encryption) {
        try {
          await client.initRustCrypto({ useIndexedDB: true });
          console.log("[matrix] Rust crypto initialized (E2EE on)");
        } catch (err) {
          console.warn(
            "[matrix] initRustCrypto failed — falling back to plaintext-only:",
            err instanceof Error ? err.message : err,
          );
        }
      }

      const RoomEvent = sdk.RoomEvent;
      const ClientEvent = sdk.ClientEvent;
      client.on(
        RoomEvent.Timeline,
        (
          event: {
            getType: () => string;
            getSender: () => string | undefined;
            getContent: () => { body?: string; msgtype?: string };
            isDecryptionFailure?: () => boolean;
          },
          room: { roomId: string } | undefined,
          toStartOfTimeline?: boolean,
        ) => {
          if (stopped || toStartOfTimeline || !live || !room) return;
          if (event.getSender() === userId) return;
          const type = event.getType();
          if (type === "m.room.encrypted") {
            if (event.isDecryptionFailure?.()) {
              console.warn(`[matrix] decrypt failed in ${room.roomId}`);
            }
            return;
          }
          if (type !== "m.room.message") return;
          const content = event.getContent();
          if (content.msgtype !== "m.text") return;
          const text = (content.body ?? "").trim();
          if (!text) return;
          onMessage({
            chatId: room.roomId,
            label: event.getSender() ?? room.roomId,
            text,
            isGroup: true,
            mentioned: true,
          });
        },
      );

      await client.startClient({ initialSyncLimit: 10 });
      client.once(ClientEvent.Sync, (state: string) => {
        if (state === "PREPARED" || state === "SYNCING") live = true;
      });
      setTimeout(() => {
        live = true;
      }, 5_000);

      return { botName: userId };
    },
    stop() {
      stopped = true;
      try {
        client?.stopClient?.();
      } catch {
        /* ignore */
      }
      client = null;
    },
    async send(chatId, text) {
      if (!client) throw new Error("Matrix not connected");
      for (const part of chunkText(text, 4000)) {
        await client.sendTextMessage(chatId, part);
      }
    },
    async indicateTyping(chatId) {
      try {
        await client?.sendTyping?.(chatId, true, 10_000);
      } catch {
        /* ignore */
      }
    },
  };
}
