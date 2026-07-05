# Channels — External Messaging Gateway

> Working notes, written 2026-07-05. Companion to `agent-extensibility-plan.md`
> (agent capabilities) and `app-platform-plan.md` (apps). This doc covers how
> the *agent reaches people* outside the web shell: inbound chat from
> messaging platforms and outbound delivery of automation results.
>
> **Coordination:** another agent owns the extensibility surface
> (`toolRegistry.ts`, `policyStore.ts`, `server/mcp/`, `server/skills/`,
> the Settings Extensions sections). Channels deliberately builds *on top of*
> that work — it registers tools through `registerToolContributor` and never
> edits those files. Owned files: `server/channels/*`,
> `src/apps/settings/ChannelsSection.tsx`, plus additive blocks in
> `shared/types.ts`, `server/index.ts`, `src/lib/api.ts`,
> `AutomationsApp.tsx`, and the scheduler's delivery hook.

## Why

The reference assistants (OpenClaw, Hermes) live in the user's existing chat
apps — WhatsApp, Telegram, Discord — and can *push* results to them.
Arco today is reachable only through its own web UI, and cron automations
die inside a session transcript nobody is watching. Channels close both
gaps: message the agent from a phone, and have automations deliver where
you'll actually see them.

## Shape

```
Telegram ⇄ adapter ⇄ gateway ⇄ runAgentTurn (existing loop)
                        │
                        ├── channelStore (data/channels.json: configs +
                        │   chat→session map; tokens masked like MCP env)
                        └── channel_send tool (via registerToolContributor)
```

- **Adapter per platform** (`ChannelAdapter`: start/stop/send). Telegram
  first — long polling against the Bot API with plain `fetch`, no SDK
  dependency. Discord and others slot in later behind the same interface.
- **Gateway** is the supervisor (MCP-supervisor pattern): boot enabled
  channels, isolate failures, expose status to Settings, route inbound
  messages to per-chat sessions (new session kind `"channel"`), serialize
  turns per chat, and send the final assistant text back.
- **Security posture** (OpenClaw's DM pairing): unknown senders get a
  pairing code and their message is *not* processed; the code is approved
  in Settings → Channels. Only allowlisted chats reach the agent.
- **Headless semantics**: channel turns run with `interactive: false`, so
  policy `confirm` degrades to `deny` — same hardening as automations. A
  chat-based confirmation flow (reply /approve) is future work.
- **Delivery**: automations gain an optional `deliver` target
  (channel + chat). The scheduler sends the run's final text after a
  successful run. The agent can also push proactively via the
  `channel_send` tool (system source, write access, allowlisted chats only).

## Not doing (v1)

- Discord/WhatsApp/Slack adapters (interface is ready; Telegram proves it)
- Voice memo transcription, media in/out (text only)
- Confirmation cards over chat (headless hardening instead)
- Webhook-mode Telegram (long polling avoids public exposure entirely)
- Group-chat mention gating (DM-first; groups work but every message routes)
