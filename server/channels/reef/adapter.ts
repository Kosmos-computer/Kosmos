/**
 * Kosmos Reef channel — OpenClaw protocol port (seal/open + signed relay transport).
 *
 * Config (ChannelConfig):
 *   token          — handle (or unused if options.handle set)
 *   options.baseUrl / relayUrl — Reef relay (default https://reefwire.ai)
 *   options.handle — reef handle
 *   options.friendsJson — { [peer]: { ed25519PublicKey, x25519PublicKey, keyEpoch, autonomy? } }
 *   options.guardProvider / guardModel / guardApiKeyEnv / policyVersion — optional LLM guard
 */
import fs from "node:fs";
import path from "node:path";
import type { ChannelConfig } from "../../../shared/types.js";
import { dataDirs } from "../../env.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { opt } from "../adapters/httpUtil.js";
import { createAllowAllGuard } from "./allowGuard.js";
import { ReefChannelConfigSchema, type ReefChannelConfig } from "./config-schema.js";
import { createConfiguredGuard, ReefMessageFlow } from "./flow.js";
import {
  generateAndStoreKeys,
  loadKeys,
  openStores,
  ReviewApprovalStore,
  writePrivateJson,
} from "./state.js";
import { ReefInboxConnection, ReefTransportClient } from "./transport.js";

function parseFriends(raw: string): ReefChannelConfig["friends"] {
  if (!raw.trim()) return {};
  try {
    const obj = JSON.parse(raw) as ReefChannelConfig["friends"];
    return obj ?? {};
  } catch {
    throw new Error("options.friendsJson must be valid JSON");
  }
}

export function createReefAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const handle = (opt(cfg, "handle") || cfg.token).trim().toLowerCase();
  if (!handle) throw new Error("Reef requires handle (token or options.handle)");
  const relayUrl = (opt(cfg, "relayUrl") || opt(cfg, "baseUrl") || "https://reefwire.ai").replace(
    /\/+$/,
    "",
  );
  const stateDir = path.join(dataDirs.root, "reef", handle);
  let stopped = false;
  let inbox: ReefInboxConnection | null = null;
  let flow: ReefMessageFlow | null = null;
  const abort = new AbortController();

  return {
    async start() {
      fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
      let keys;
      try {
        keys = await loadKeys(stateDir);
      } catch {
        keys = await generateAndStoreKeys(stateDir);
        console.log(`[reef] generated identity keys under ${stateDir}`);
      }

      const friendsPath = path.join(stateDir, "friends.json");
      let friends = parseFriends(opt(cfg, "friendsJson"));
      if (!Object.keys(friends).length && fs.existsSync(friendsPath)) {
        friends = JSON.parse(fs.readFileSync(friendsPath, "utf8")) as ReefChannelConfig["friends"];
      }
      if (Object.keys(friends).length) {
        await writePrivateJson(friendsPath, friends);
      }

      const config = ReefChannelConfigSchema.parse({
        enabled: true,
        relayUrl,
        handle,
        email: opt(cfg, "email") || undefined,
        friends,
        stateDir,
        ...(opt(cfg, "guardProvider")
          ? {
              guard: {
                provider: opt(cfg, "guardProvider") as "openai" | "anthropic",
                pinnedModel: opt(cfg, "guardModel") || "gpt-5.6-sol",
                apiKeyEnv: opt(cfg, "guardApiKeyEnv") || "OPENAI_API_KEY",
                policyVersion: opt(cfg, "policyVersion") || "kosmos-1",
                timeoutMs: Number(opt(cfg, "guardTimeoutMs") || "10000") || 10_000,
              },
            }
          : {}),
      });

      const transport = new ReefTransportClient(relayUrl, handle, keys);
      const stores = openStores(stateDir, keys);
      const reviews = new ReviewApprovalStore(stateDir);
      let guard;
      try {
        guard = config.guard ? createConfiguredGuard(config) : createAllowAllGuard();
      } catch (err) {
        console.warn(
          "[reef] guard config failed, using allow-all:",
          err instanceof Error ? err.message : err,
        );
        guard = createAllowAllGuard();
      }

      // Pipeline still requires policyVersion on compose — inject via synthetic guard config.
      if (!config.guard) {
        (config as { guard?: ReefChannelConfig["guard"] }).guard = {
          provider: "openai",
          pinnedModel: "gpt-5.6-sol",
          apiKeyEnv: "OPENAI_API_KEY",
          policyVersion: "kosmos-allow",
          timeoutMs: 10_000,
        };
      }

      flow = new ReefMessageFlow({
        config,
        keys,
        stateDir,
        transport,
        guard,
        audit: stores.audit,
        replay: stores.replay,
        reviews,
        onIngress: async (message) => {
          if (stopped) return;
          onMessage({
            chatId: message.peer,
            label: `@${message.peer}`,
            text: message.text,
            isGroup: false,
            mentioned: true,
          });
        },
        onOwnerNotice: async (text) => {
          console.log(`[reef] owner notice: ${text.slice(0, 200)}`);
        },
      });

      inbox = new ReefInboxConnection(
        transport,
        async (entries) => {
          await flow?.processEntries(entries);
        },
        (url) => new WebSocket(url) as unknown as import("./transport.js").WebSocketLike,
        (state) => console.log(`[reef] inbox ${state}`),
      );
      void inbox.start(abort.signal);
      console.log(
        `[reef] handle=@${handle} relay=${relayUrl} friends=${Object.keys(friends).length}`,
      );
      return { botName: `@${handle}` };
    },
    stop() {
      stopped = true;
      abort.abort();
      inbox?.stop();
      inbox = null;
      flow = null;
    },
    async send(chatId, text) {
      if (!flow) throw new Error("Reef not started");
      const peer = chatId.replace(/^@/, "").toLowerCase();
      await flow.send(peer, text);
    },
    async indicateTyping() {},
  };
}
