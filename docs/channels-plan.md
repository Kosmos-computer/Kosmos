# Channels — External Messaging Gateway

> Updated 2026-07-19. Companion to `agent-extensibility-plan.md` and
> `app-platform-plan.md`. Catalog source of truth: `shared/channelCatalog.ts`.

## Shape

```
Platform adapter ⇄ gateway ⇄ runAgentTurn
         │
         ├── channelStore (data/channels.json)
         ├── channelConfirm (/approve + Slack Block Kit)
         ├── webhookRoutes (/api/channels/webhook/:kind/:id)
         └── channel_send tool
```

Settings → Channels is **catalog-driven** (all kinds + field specs).

## Maturity

| Tier | Kinds |
|------|--------|
| **stable** | telegram, discord, slack, mattermost, irc, sms, synologychat, webchat |
| **beta** | matrix (unencrypted), whatsapp, signal, imessage, feishu, line, nextcloudtalk, twitch, msteams, googlechat, nostr, raft, voicecall, wecom |
| **bridge / stub** | reef (HTTP shim), tlon, zalo, qqbot, yuanbao, clickclack, zalouser, wechat |

## Protocol notes (OpenClaw-aligned)

- **Slack**: Socket Mode; mention/message dedupe; Block Kit confirms.
- **Telegram**: `deleteWebhook` before long-poll.
- **IRC/Twitch**: JOIN after numeric `001`; Twitch requires lowercase `nick`.
- **Teams**: Bot Framework activity + JWKS JWT verify + client_credentials send.
- **Google Chat**: SA JWT mint (`chat.bot`) + inbound Chat cert verify.
- **Signal**: `ws …/v1/receive/{number}` + `POST /v2/send` (signal-cli-rest-api).
- **Nostr**: NIP-04 via `nostr-tools`.
- **Raft**: loopback `/wake` + spawn `raft agent bridge`.
- **Voice**: `mode=gather` (SpeechResult) or `mode=stream` (`<Connect><Stream>` + Whisper; needs `OPENAI_API_KEY` + public `wss` base).
- **Matrix**: `matrix-js-sdk` + optional `initRustCrypto` (`encryption=true`; WASM on Node 22).
- **Reef**: OpenClaw protocol ported under `server/channels/reef/` (seal/open, signed relay, optional LLM guard).

## Content Agent pack (Path A)

Agents → **Install Content Agent** seeds skills + `agent:user:content` + weekly automations checklist (Slack delivery).

## Security

- DM pairing (approve in Settings).
- Group `requireMention` (default true).
- Twilio / LINE signatures when secrets configured.
- Teams / Google Chat inbound JWT verification.
