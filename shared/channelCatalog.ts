/**
 * OpenClaw-aligned channel catalog — every messaging surface Kosmos can
 * configure. Adapters implement ChannelAdapter; this file owns labels, fields,
 * and maturity so Settings stays data-driven.
 */
import type { ChannelKind } from "./types.js";

export type ChannelMaturity = "stable" | "beta" | "experimental" | "bridge";
export type ChannelTransport =
  | "bot-token"
  | "socket"
  | "webhook"
  | "qr-session"
  | "host-bridge"
  | "internal"
  | "telephony";

export interface ChannelFieldSpec {
  key: "token" | "appToken" | string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  required?: boolean;
  hint?: string;
}

export interface ChannelKindMeta {
  kind: ChannelKind;
  label: string;
  description: string;
  maturity: ChannelMaturity;
  transport: ChannelTransport;
  /** Extra ChannelConfig.options keys (host, baseUrl, …). */
  fields: ChannelFieldSpec[];
  setup: string;
  /** Prefer Socket Mode / long-poll over public webhook when true. */
  noPublicUrl?: boolean;
}

/** All kinds in alphabetical order for pickers (except shipped first). */
export const CHANNEL_CATALOG: ChannelKindMeta[] = [
  {
    kind: "telegram",
    label: "Telegram",
    description: "Bot API via long polling",
    maturity: "stable",
    transport: "bot-token",
    noPublicUrl: true,
    fields: [{ key: "token", label: "Bot token", secret: true, required: true, placeholder: "123456:AA…" }],
    setup: "Message @BotFather → /newbot → paste the token.",
  },
  {
    kind: "discord",
    label: "Discord",
    description: "Bot Gateway WebSocket",
    maturity: "stable",
    transport: "socket",
    noPublicUrl: true,
    fields: [{ key: "token", label: "Bot token", secret: true, required: true }],
    setup: "Discord Developer Portal → Bot → token; enable Message Content Intent.",
  },
  {
    kind: "slack",
    label: "Slack",
    description: "Socket Mode bot",
    maturity: "stable",
    transport: "socket",
    noPublicUrl: true,
    fields: [
      { key: "token", label: "Bot token (xoxb-…)", secret: true, required: true },
      { key: "appToken", label: "App token (xapp-…)", secret: true, required: true },
    ],
    setup: "Enable Socket Mode; app-level token with connections:write; install bot.",
  },
  {
    kind: "mattermost",
    label: "Mattermost",
    description: "Self-hosted team chat (bot + WebSocket)",
    maturity: "stable",
    transport: "socket",
    noPublicUrl: true,
    fields: [
      { key: "token", label: "Bot token", secret: true, required: true },
      { key: "baseUrl", label: "Base URL", required: true, placeholder: "https://chat.example.com" },
    ],
    setup: "Create a Mattermost bot, copy token + server URL (trailing /api/v4 stripped).",
  },
  {
    kind: "irc",
    label: "IRC",
    description: "Classic IRC channels and DMs",
    maturity: "stable",
    transport: "socket",
    noPublicUrl: true,
    fields: [
      { key: "token", label: "Nick", required: true, placeholder: "kosmos-bot", secret: false },
      { key: "host", label: "Host", required: true, placeholder: "irc.libera.chat" },
      { key: "port", label: "Port", placeholder: "6697" },
      { key: "channels", label: "Channels to join", placeholder: "#kosmos", hint: "Comma-separated" },
      { key: "password", label: "Server password", secret: true },
    ],
    setup: "Set host, nick, and channels. TLS on 6697 by default.",
  },
  {
    kind: "matrix",
    label: "Matrix",
    description: "matrix-js-sdk sync + optional Rust E2EE",
    maturity: "beta",
    transport: "bot-token",
    noPublicUrl: true,
    fields: [
      { key: "token", label: "Access token", secret: true, required: true },
      { key: "baseUrl", label: "Homeserver URL", required: true, placeholder: "https://matrix.org" },
      { key: "userId", label: "User ID", placeholder: "@bot:matrix.org" },
      {
        key: "encryption",
        label: "E2EE (true/false)",
        placeholder: "false",
        hint: "true enables matrix-js-sdk initRustCrypto (WASM on Node 22)",
      },
      { key: "deviceId", label: "Device ID (optional)" },
    ],
    setup:
      "Paste access token + homeserver URL. Set encryption=true for Rust crypto (same stack as OpenClaw). Device verification/cross-signing still manual on first devices.",
  },
  {
    kind: "whatsapp",
    label: "WhatsApp",
    description: "Baileys linked-device session (QR)",
    maturity: "beta",
    transport: "qr-session",
    noPublicUrl: true,
    fields: [
      { key: "token", label: "Session id", required: true, placeholder: "default", secret: false, hint: "Local session folder name under data/whatsapp/" },
    ],
    setup: "Start channel, scan QR printed in server logs (Baileys). Personal WhatsApp number.",
  },
  {
    kind: "signal",
    label: "Signal",
    description: "signal-cli-rest-api WebSocket + /v2/send",
    maturity: "beta",
    transport: "host-bridge",
    noPublicUrl: true,
    fields: [
      { key: "token", label: "Signal number", required: true, placeholder: "+15551234567", secret: false },
      { key: "baseUrl", label: "Container API URL", required: true, placeholder: "http://127.0.0.1:8080" },
    ],
    setup:
      "Run bbernhard/signal-cli-rest-api; Kosmos connects to ws://…/v1/receive/{number} and POST /v2/send (not native signal-cli SSE).",
  },
  {
    kind: "imessage",
    label: "iMessage",
    description: "macOS imsg bridge",
    maturity: "bridge",
    transport: "host-bridge",
    fields: [
      { key: "token", label: "imsg command / path", required: true, placeholder: "imsg", secret: false },
    ],
    setup: "Requires a signed-in Mac with imsg. Hosted Fly tenants cannot use this.",
  },
  {
    kind: "msteams",
    label: "Microsoft Teams",
    description: "Bot Framework webhook + client_credentials send",
    maturity: "beta",
    transport: "webhook",
    fields: [
      { key: "token", label: "App password", secret: true, required: true },
      { key: "appId", label: "App ID", required: true },
      { key: "tenantId", label: "Tenant ID", placeholder: "botframework.com or directory GUID" },
      { key: "serviceUrl", label: "Fallback serviceUrl", placeholder: "https://smba.trafficmanager.net/…" },
    ],
    setup:
      "Messaging endpoint → /api/channels/webhook/msteams/<id>. Mints https://api.botframework.com/.default token; stores conversation ref from inbound activity. Inbound JWT aud must match appId.",
  },
  {
    kind: "feishu",
    label: "Feishu / Lark",
    description: "Event webhook + tenant_access_token send",
    maturity: "beta",
    transport: "webhook",
    fields: [
      { key: "token", label: "App Secret", secret: true, required: true },
      { key: "appId", label: "App ID", required: true },
      { key: "baseUrl", label: "API domain", placeholder: "https://open.feishu.cn", hint: "Use open.larksuite.com for Lark" },
    ],
    setup:
      "Feishu event subscription → /api/channels/webhook/feishu/<id> (URL verification + im.message.receive_v1). Send uses tenant_access_token — not proprietary Feishu WS.",
  },
  {
    kind: "googlechat",
    label: "Google Chat",
    description: "Chat API HTTP webhook + service-account send",
    maturity: "beta",
    transport: "webhook",
    fields: [
      {
        key: "token",
        label: "Service account JSON (path or inline)",
        secret: true,
        required: true,
      },
      {
        key: "audience",
        label: "Webhook audience (URL or project number)",
        required: true,
        hint: "Must match Chat app HTTP endpoint URL used for JWT aud",
      },
      { key: "webhookUrl", label: "Public webhook URL (alias for audience)" },
    ],
    setup:
      "Endpoint → /api/channels/webhook/googlechat/<id>. Paste SA JSON; set audience to the public webhook URL. Send uses chat.bot scope; threads preserved when present.",
  },
  {
    kind: "line",
    label: "LINE",
    description: "LINE Messaging API",
    maturity: "beta",
    transport: "webhook",
    fields: [
      { key: "token", label: "Channel access token", secret: true, required: true },
      { key: "appToken", label: "Channel secret", secret: true, required: true },
    ],
    setup: "LINE Developers → Messaging API; webhook /api/channels/webhook/line/<id>.",
  },
  {
    kind: "nextcloudtalk",
    label: "Nextcloud Talk",
    description: "Self-hosted Talk bot webhook",
    maturity: "beta",
    transport: "webhook",
    fields: [
      { key: "token", label: "Shared secret", secret: true, required: true },
      { key: "baseUrl", label: "Nextcloud URL", required: true },
    ],
    setup: "Configure Talk webhook bot; point to /api/channels/webhook/nextcloudtalk/<id>.",
  },
  {
    kind: "nostr",
    label: "Nostr",
    description: "NIP-04 encrypted DMs (nostr-tools)",
    maturity: "beta",
    transport: "bot-token",
    noPublicUrl: true,
    fields: [
      { key: "token", label: "nsec or hex private key", secret: true, required: true },
      {
        key: "relays",
        label: "Relays",
        placeholder: "wss://relay.damus.io,wss://nos.lol",
        hint: "Comma-separated",
      },
    ],
    setup: "Paste nsec (or hex sk). Subscribes to kind:4 DMs tagged to your pubkey; replies encrypt with NIP-04.",
  },
  {
    kind: "qqbot",
    label: "QQ Bot",
    description: "External HTTP bridge (/v1/poll) — stub",
    maturity: "bridge",
    transport: "host-bridge",
    fields: [
      { key: "token", label: "Bridge token", secret: true, required: true },
      { key: "appId", label: "App ID" },
      { key: "baseUrl", label: "Bridge URL", required: true },
    ],
    setup: "Requires an external QQ bridge exposing /v1/poll and /v1/send.",
  },
  {
    kind: "sms",
    label: "SMS (Twilio)",
    description: "Twilio inbound SMS webhook",
    maturity: "stable",
    transport: "webhook",
    fields: [
      { key: "token", label: "Auth Token", secret: true, required: true },
      { key: "accountSid", label: "Account SID", required: true },
      { key: "fromNumber", label: "From number", placeholder: "+15551234567" },
      {
        key: "webhookUrl",
        label: "Public webhook URL",
        required: true,
        hint: "Exact URL Twilio calls (for X-Twilio-Signature)",
      },
    ],
    setup:
      "Twilio number webhook → /api/channels/webhook/sms/<id>. Set webhookUrl to that exact public URL for signature checks.",
  },
  {
    kind: "synologychat",
    label: "Synology Chat",
    description: "NAS Chat incoming/outgoing webhooks",
    maturity: "stable",
    transport: "webhook",
    fields: [
      { key: "token", label: "Outgoing webhook token", secret: true, required: true },
      { key: "baseUrl", label: "Incoming webhook URL", required: true },
    ],
    setup: "Synology Chat → Integrations → webhooks.",
  },
  {
    kind: "twitch",
    label: "Twitch",
    description: "Twitch IRC chat",
    maturity: "beta",
    transport: "socket",
    noPublicUrl: true,
    fields: [
      { key: "token", label: "OAuth token", secret: true, required: true, placeholder: "oauth:…" },
      { key: "channels", label: "Channel login", required: true, placeholder: "mychannel" },
      { key: "nick", label: "Bot login", required: true },
    ],
    setup: "Twitch token with chat:read chat:write; join your channel.",
  },
  {
    kind: "tlon",
    label: "Tlon (Urbit)",
    description: "External HTTP bridge — stub",
    maturity: "bridge",
    transport: "host-bridge",
    fields: [
      { key: "token", label: "Bridge token", secret: true, required: true },
      { key: "baseUrl", label: "Bridge URL", required: true },
    ],
    setup: "Requires an external Tlon/Urbit bridge with /poll and /send.",
  },
  {
    kind: "zalo",
    label: "Zalo Bot",
    description: "External HTTP bridge (/v1/poll) — stub",
    maturity: "bridge",
    transport: "host-bridge",
    noPublicUrl: true,
    fields: [
      { key: "token", label: "Bridge token", secret: true, required: true },
      { key: "baseUrl", label: "Bridge URL", required: true },
    ],
    setup: "Requires an external Zalo bridge exposing /v1/poll and /v1/send.",
  },
  {
    kind: "zalouser",
    label: "Zalo Personal",
    description: "JSONL session drop folder — stub",
    maturity: "bridge",
    transport: "qr-session",
    fields: [{ key: "token", label: "Session id", required: true, secret: false }],
    setup: "Drop inbound lines into data/zalouser/<id>/inbox.jsonl. No built-in QR client.",
  },
  {
    kind: "wechat",
    label: "WeChat",
    description: "JSONL session drop folder — stub",
    maturity: "bridge",
    transport: "qr-session",
    fields: [{ key: "token", label: "Session id", required: true, secret: false }],
    setup: "Drop inbound lines into data/wechat/<id>/inbox.jsonl. No built-in iLink QR.",
  },
  {
    kind: "wecom",
    label: "WeCom",
    description: "Enterprise WeChat",
    maturity: "experimental",
    transport: "webhook",
    fields: [
      { key: "token", label: "Secret", secret: true, required: true },
      { key: "appId", label: "Corp ID", required: true },
      { key: "agentId", label: "Agent ID", required: true },
    ],
    setup: "WeCom app credentials; webhook callback URL.",
  },
  {
    kind: "yuanbao",
    label: "Yuanbao",
    description: "External HTTP bridge — stub",
    maturity: "bridge",
    transport: "host-bridge",
    fields: [
      { key: "token", label: "Bridge token", secret: true, required: true },
      { key: "baseUrl", label: "Bridge URL", required: true },
    ],
    setup: "Requires an external Yuanbao bridge with /v1/poll and /v1/send.",
  },
  {
    kind: "clickclack",
    label: "ClickClack",
    description: "External HTTP bridge — stub",
    maturity: "bridge",
    transport: "host-bridge",
    fields: [
      { key: "token", label: "Bridge token", secret: true, required: true },
      { key: "baseUrl", label: "ClickClack / bridge URL", required: true },
    ],
    setup: "Requires a bridge exposing /v1/poll and /v1/send on baseUrl.",
  },
  {
    kind: "webchat",
    label: "WebChat",
    description: "Embedded guest chat over this Kosmos instance",
    maturity: "stable",
    transport: "internal",
    noPublicUrl: true,
    fields: [{ key: "token", label: "Room secret (optional)", secret: true }],
    setup: "Opens /webchat/<channelId>. Pair browser sessions like other channels.",
  },
  {
    kind: "reef",
    label: "Reef",
    description: "E2EE claw-to-claw mail (OpenClaw protocol port)",
    maturity: "beta",
    transport: "internal",
    fields: [
      { key: "token", label: "Handle", required: true, secret: false, placeholder: "mybot" },
      {
        key: "relayUrl",
        label: "Relay URL",
        placeholder: "https://reefwire.ai",
        hint: "Or options.baseUrl",
      },
      {
        key: "friendsJson",
        label: "Friends JSON",
        hint: '{ "peer": { "ed25519PublicKey", "x25519PublicKey", "keyEpoch", "autonomy?" } }',
      },
      { key: "email", label: "Auth email (relay account)" },
      {
        key: "guardProvider",
        label: "Guard provider (optional)",
        placeholder: "openai",
        hint: "openai | anthropic — omit for allow-all",
      },
      { key: "guardModel", label: "Pinned guard model", placeholder: "gpt-5.6-sol" },
      { key: "guardApiKeyEnv", label: "Guard API key env", placeholder: "OPENAI_API_KEY" },
    ],
    setup:
      "OpenClaw Reef protocol ported under server/channels/reef/. Keys stored in data/reef/<handle>/. Approve friends via friendsJson; optional LLM DLP guard.",
  },
  {
    kind: "raft",
    label: "Raft",
    description: "Raft CLI wake-channel bridge",
    maturity: "beta",
    transport: "host-bridge",
    fields: [
      { key: "token", label: "Profile name", required: true, secret: false, placeholder: "default" },
      { key: "profile", label: "Raft profile (alias)", placeholder: "default" },
    ],
    setup:
      "Requires `raft` on PATH, signed in. Spawns `raft agent bridge --wake-channel-endpoint` against a loopback /wake (no text in wake payloads).",
  },
  {
    kind: "voicecall",
    label: "Voice Call",
    description: "Twilio Gather or Media Streams + Whisper",
    maturity: "beta",
    transport: "telephony",
    fields: [
      { key: "token", label: "Auth token", secret: true, required: true },
      { key: "accountSid", label: "Account SID / API key", required: true },
      { key: "fromNumber", label: "From number", required: true },
      { key: "provider", label: "Provider", placeholder: "twilio" },
      {
        key: "mode",
        label: "Mode",
        placeholder: "gather",
        hint: "gather (default) or stream",
      },
      {
        key: "streamUrl",
        label: "Public wss base for streams",
        placeholder: "wss://your.host",
        hint: "Required for mode=stream; path /voice-stream/:token is appended. Needs OPENAI_API_KEY for Whisper.",
      },
    ],
    setup:
      "Webhook → /api/channels/webhook/voicecall/<id>. mode=gather uses SpeechResult; mode=stream returns <Connect><Stream> and STTs with Whisper (OPENAI_API_KEY). Replies via Twilio Call Twiml Say when CallSid known.",
  },
];

const BY_KIND = new Map(CHANNEL_CATALOG.map((c) => [c.kind, c]));

export function channelMeta(kind: ChannelKind): ChannelKindMeta | undefined {
  return BY_KIND.get(kind);
}

export function isChannelKind(value: string): value is ChannelKind {
  return BY_KIND.has(value as ChannelKind);
}

export const CHANNEL_KIND_VALUES = CHANNEL_CATALOG.map((c) => c.kind);
