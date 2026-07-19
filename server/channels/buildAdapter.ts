/**
 * Channel adapter factory — maps ChannelKind → ChannelAdapter.
 */
import type { ChannelConfig } from "../../shared/types.js";
import type { ChannelAdapter, InboundMessage } from "./gateway.js";
import {
  createFeishuAdapter,
  createHttpBotAdapter,
  createSessionStubAdapter,
  createSignalAdapter,
  createWhatsappAdapter,
} from "./adapters/bridges.js";
import { createClickclackAdapter } from "./adapters/clickclack.js";
import { createImessageRpcAdapter } from "./adapters/imessageRpc.js";
import { createIrcAdapter } from "./adapters/irc.js";
import { createMatrixSdkAdapter } from "./adapters/matrixSdk.js";
import { createMattermostAdapter } from "./adapters/mattermost.js";
import { createNostrAdapter } from "./adapters/nostr.js";
import { createQqbotAdapter } from "./adapters/qqbot.js";
import { createRaftAdapter } from "./adapters/raft.js";
import { createTlonAdapter } from "./adapters/tlon.js";
import { createTwitchAdapter } from "./adapters/twitch.js";
import { createWebchatAdapter } from "./adapters/webchat.js";
import { createWebhookChannelAdapter } from "./adapters/webhookChannel.js";
import { createZaloBotAdapter } from "./adapters/zaloBot.js";
import { createZalouserAdapter } from "./adapters/zalouser.js";
import { createDiscordAdapter } from "./discord.js";
import { createReefAdapter } from "./reef/adapter.js";
import { createSlackAdapter } from "./slack.js";
import { createTelegramAdapter } from "./telegram.js";

export type SlackInteractiveHandler = (payload: {
  confirmId: string;
  decision: "once" | "session" | "always" | "deny";
  chatId: string;
  userId: string;
  messageTs?: string;
}) => void;

export function buildChannelAdapter(
  channelId: string,
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
  onSlackInteractive?: SlackInteractiveHandler,
): ChannelAdapter {
  switch (cfg.kind) {
    case "telegram":
      return createTelegramAdapter(cfg.token, onMessage);
    case "discord":
      return createDiscordAdapter(cfg.token, onMessage);
    case "slack": {
      const appToken = cfg.appToken?.trim();
      if (!appToken) throw new Error("Slack requires an app-level token (xapp-…)");
      return createSlackAdapter(cfg.token, appToken, onMessage, onSlackInteractive);
    }
    case "mattermost":
      return createMattermostAdapter(cfg, onMessage);
    case "irc":
      return createIrcAdapter(cfg, onMessage);
    case "matrix":
      return createMatrixSdkAdapter(cfg, onMessage);
    case "twitch":
      return createTwitchAdapter(cfg, onMessage);
    case "whatsapp":
      return createWhatsappAdapter(cfg, onMessage);
    case "signal":
      return createSignalAdapter(cfg, onMessage);
    case "imessage":
      return createImessageRpcAdapter(cfg, onMessage);
    case "feishu":
      return createFeishuAdapter(channelId, cfg, onMessage);
    case "webchat":
      return createWebchatAdapter(channelId, cfg, onMessage);
    case "sms":
    case "synologychat":
    case "line":
    case "nextcloudtalk":
    case "msteams":
    case "googlechat":
    case "wecom":
    case "voicecall":
      return createWebhookChannelAdapter(channelId, cfg, onMessage);
    case "nostr":
      return createNostrAdapter(cfg, onMessage);
    case "raft":
      return createRaftAdapter(cfg, onMessage);
    case "zalo":
      return createZaloBotAdapter(cfg, onMessage);
    case "zalouser":
      return createZalouserAdapter(cfg, onMessage);
    case "qqbot":
      return createQqbotAdapter(cfg, onMessage);
    case "clickclack":
      return createClickclackAdapter(cfg, onMessage);
    case "tlon":
      return createTlonAdapter(cfg, onMessage);
    case "reef":
      return createReefAdapter(channelId, cfg, onMessage);
    case "yuanbao":
      // No in-tree OpenClaw source — external HTTP bridge only.
      return createHttpBotAdapter(cfg, onMessage, {
        label: cfg.kind,
        pollPath: "/v1/poll",
        sendPath: () => "/v1/send",
      });
    case "wechat":
      // No in-tree OpenClaw iLink client — JSONL session drop folder.
      return createSessionStubAdapter(cfg.kind, cfg, onMessage);
    default: {
      const _exhaustive: never = cfg.kind;
      throw new Error(`Unsupported channel kind: ${_exhaustive}`);
    }
  }
}
