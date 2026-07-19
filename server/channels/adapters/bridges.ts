/**
 * Host-bridge / QR-session channels — Signal (signal-cli REST), WhatsApp (Baileys
 * dynamic), iMessage (imsg spawn), plus experimental QR/session stubs that
 * poll a local session file / HTTP bridge when available.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { ChannelConfig } from "../../../shared/types.js";
import { dataDirs } from "../../env.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { chunkText, jsonFetch, opt } from "./httpUtil.js";
import { registerWebhookListener, unregisterWebhookListener } from "./webhookQueue.js";

/**
 * Signal via signal-cli-rest-api (bbernhard): WebSocket receive + REST send.
 * OpenClaw uses the same container transport (ws …/v1/receive/{account}).
 * Native signal-cli SSE (/api/v1/events) is a separate stack — not this adapter.
 */
export function createSignalAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const base = opt(cfg, "baseUrl").replace(/\/+$/, "");
  const number = cfg.token.trim();
  if (!base || !number) throw new Error("Signal requires phone (token) and options.baseUrl");
  let stopped = false;
  let ws: WebSocket | null = null;

  function handleEnvelope(raw: unknown): void {
    const m = raw as {
      envelope?: {
        sourceNumber?: string;
        sourceName?: string;
        dataMessage?: { message?: string; groupInfo?: { groupId?: string } };
      };
    };
    const from =
      m.envelope?.dataMessage?.groupInfo?.groupId || m.envelope?.sourceNumber;
    const text = m.envelope?.dataMessage?.message?.trim();
    if (!from || !text) return;
    const isGroup = Boolean(m.envelope?.dataMessage?.groupInfo?.groupId);
    onMessage({
      chatId: from,
      label: m.envelope?.sourceName || m.envelope?.sourceNumber || from,
      text,
      isGroup,
      mentioned: true,
    });
  }

  async function connectLoop(): Promise<void> {
    while (!stopped) {
      const wsUrl = `${base.replace(/^http/, "ws")}/v1/receive/${encodeURIComponent(number)}`;
      try {
        await new Promise<void>((resolve) => {
          const socket = new WebSocket(wsUrl);
          ws = socket;
          socket.addEventListener("open", () => {
            console.log("[signal] WebSocket connected");
          });
          socket.addEventListener("message", (ev) => {
            try {
              const data = JSON.parse(String(ev.data)) as unknown;
              if (Array.isArray(data)) {
                for (const item of data) handleEnvelope(item);
              } else {
                handleEnvelope(data);
              }
            } catch (err) {
              console.warn(
                "[signal] parse:",
                err instanceof Error ? err.message : err,
              );
            }
          });
          socket.addEventListener("error", () => {
            /* close handler reconnects */
          });
          socket.addEventListener("close", () => {
            ws = null;
            resolve();
          });
        });
      } catch (err) {
        console.warn("[signal] ws:", err instanceof Error ? err.message : err);
      }
      if (!stopped) await new Promise((r) => setTimeout(r, 3_000));
    }
  }

  return {
    async start() {
      void connectLoop();
      return { botName: number };
    },
    stop() {
      stopped = true;
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
      ws = null;
    },
    async send(chatId, text) {
      await jsonFetch(`${base}/v2/send`, {
        method: "POST",
        body: JSON.stringify({
          number,
          recipients: [chatId],
          message: text.slice(0, 2000),
        }),
      });
    },
    async indicateTyping() {},
  };
}

export function createImessageAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const cmd = cfg.token.trim() || "imsg";
  let child: ReturnType<typeof spawn> | null = null;
  let stopped = false;

  return {
    async start() {
      if (process.platform !== "darwin") {
        throw new Error("iMessage bridge requires macOS (imsg). Not available on this host.");
      }
      child = spawn(cmd, ["watch", "--json"], { stdio: ["ignore", "pipe", "pipe"] });
      let buf = "";
      child.stdout?.on("data", (chunk: Buffer) => {
        buf += chunk.toString("utf8");
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          try {
            const ev = JSON.parse(line) as {
              text?: string;
              sender?: string;
              chat_id?: string;
              is_group?: boolean;
            };
            if (!ev.text || !ev.chat_id) continue;
            onMessage({
              chatId: String(ev.chat_id),
              label: ev.sender ?? ev.chat_id,
              text: ev.text,
              isGroup: Boolean(ev.is_group),
              mentioned: true,
            });
          } catch {
            /* ignore */
          }
        }
      });
      child.on("exit", () => {
        if (!stopped) console.warn("[imessage] imsg exited");
      });
      return { botName: "imessage" };
    },
    stop() {
      stopped = true;
      child?.kill();
      child = null;
    },
    async send(chatId, text) {
      await new Promise<void>((resolve, reject) => {
        const p = spawn(cmd, ["send", "--to", chatId, "--text", text.slice(0, 4000)], {
          stdio: "ignore",
        });
        p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`imsg send ${code}`))));
      });
    },
    async indicateTyping() {},
  };
}

/**
 * WhatsApp via optional @whiskeysockets/baileys — dynamic import so the core
 * install stays light until the channel is used. Auto-reconnects unless logged out.
 */
export function createWhatsappAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const sessionId = cfg.token.trim() || "default";
  const authDir = path.join(dataDirs.root, "whatsapp", sessionId);
  let sock: {
    sendMessage: (jid: string, content: { text: string }) => Promise<unknown>;
    end?: (err?: Error) => void;
  } | null = null;
  let stopped = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let baileys: any;
  let connecting: Promise<void> | null = null;

  async function connect(): Promise<void> {
    if (stopped) return;
    fs.mkdirSync(authDir, { recursive: true });
    if (!baileys) {
      try {
        baileys = await import(/* @vite-ignore */ "@whiskeysockets/baileys");
      } catch {
        throw new Error(
          "WhatsApp requires @whiskeysockets/baileys. Run: npm i @whiskeysockets/baileys — then restart.",
        );
      }
    }
    const makeWASocket = baileys.default ?? baileys.makeWASocket;
    const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();
    const s = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: true,
    });
    sock = s;
    s.ev.on("creds.update", () => {
      void saveCreds();
    });
    s.ev.on(
      "connection.update",
      (u: {
        connection?: string;
        lastDisconnect?: { error?: { output?: { statusCode?: number } } };
        qr?: string;
      }) => {
        if (u.qr) console.log("[whatsapp] Scan QR (also printed above). Session:", sessionId);
        if (u.connection === "open") {
          console.log("[whatsapp] connected:", sessionId);
        }
        if (u.connection === "close") {
          const code = u.lastDisconnect?.error?.output?.statusCode;
          sock = null;
          if (stopped) return;
          if (code === DisconnectReason?.loggedOut) {
            console.warn("[whatsapp] logged out — delete session dir to re-pair:", authDir);
            return;
          }
          console.warn("[whatsapp] disconnected; reconnecting in 3s…");
          setTimeout(() => {
            if (!stopped && !connecting) {
              connecting = connect()
                .catch((err) =>
                  console.warn("[whatsapp] reconnect:", err instanceof Error ? err.message : err),
                )
                .finally(() => {
                  connecting = null;
                });
            }
          }, 3_000);
        }
      },
    );
    s.ev.on(
      "messages.upsert",
      (raw: {
        type?: string;
        messages?: Array<{
          key?: { remoteJid?: string; fromMe?: boolean; participant?: string };
          message?: { conversation?: string; extendedTextMessage?: { text?: string } };
          pushName?: string;
        }>;
      }) => {
        if (raw.type !== "notify") return;
        for (const m of raw.messages ?? []) {
          if (m.key?.fromMe) continue;
          const jid = m.key?.remoteJid;
          if (!jid) continue;
          const text =
            m.message?.conversation || m.message?.extendedTextMessage?.text || "";
          if (!text.trim()) continue;
          const isGroup = jid.endsWith("@g.us");
          onMessage({
            chatId: jid,
            label: m.pushName || m.key?.participant || jid,
            text: text.trim(),
            isGroup,
            mentioned: true,
          });
        }
      },
    );
  }

  return {
    async start() {
      await connect();
      return { botName: `whatsapp:${sessionId}` };
    },
    stop() {
      stopped = true;
      try {
        sock?.end?.();
      } catch {
        /* ignore */
      }
      sock = null;
    },
    async send(chatId, text) {
      if (!sock) throw new Error("WhatsApp not connected");
      for (const part of chunkText(text, 4000)) {
        await sock.sendMessage(chatId, { text: part });
      }
    },
    async indicateTyping() {},
  };
}

/** Generic HTTP bridge for Feishu-like / ClickClack / QQ / experimental APIs. */
export function createHttpBotAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
  opts: { label: string; pollPath?: string; sendPath?: (chatId: string) => string },
): ChannelAdapter {
  const base = opt(cfg, "baseUrl").replace(/\/+$/, "");
  let stopped = false;

  async function poll(): Promise<void> {
    if (!base || !opts.pollPath) return;
    while (!stopped) {
      try {
        const data = await jsonFetch<{
          messages?: Array<{ chatId: string; text: string; label?: string; isGroup?: boolean }>;
        }>(`${base}${opts.pollPath}`, {
          headers: { Authorization: `Bearer ${cfg.token}` },
        });
        for (const m of data.messages ?? []) {
          onMessage({
            chatId: m.chatId,
            label: m.label ?? m.chatId,
            text: m.text,
            isGroup: m.isGroup,
            mentioned: true,
          });
        }
      } catch {
        await new Promise((r) => setTimeout(r, 5_000));
      }
      await new Promise((r) => setTimeout(r, 2_000));
    }
  }

  return {
    async start() {
      if (!cfg.token) throw new Error(`${opts.label} requires a token`);
      if (!base) {
        throw new Error(
          `${opts.label} requires options.baseUrl pointing at an HTTP bridge with ${opts.pollPath ?? "/poll"} and send paths (not a built-in protocol client)`,
        );
      }
      void poll();
      return { botName: opts.label };
    },
    stop() {
      stopped = true;
    },
    async send(chatId, text) {
      if (!base) {
        console.log(`[${opts.label}] → ${chatId}: ${text.slice(0, 200)}`);
        return;
      }
      const path = opts.sendPath?.(chatId) ?? `/send`;
      await jsonFetch(`${base}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.token}` },
        body: JSON.stringify({ chatId, text }),
      });
    },
    async indicateTyping() {},
  };
}

/**
 * Feishu/Lark — inbound via event webhook queue; outbound via tenant_access_token
 * + im/v1/messages (OpenClaw send.ts shape). Proprietary Feishu WS is not embedded.
 */
export function createFeishuAdapter(
  channelId: string,
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const appId = opt(cfg, "appId");
  if (!appId || !cfg.token) throw new Error("Feishu requires appId and App Secret (token)");
  const domain = (opt(cfg, "baseUrl") || "https://open.feishu.cn").replace(/\/+$/, "");
  let cachedToken: { value: string; exp: number } | null = null;

  async function tenantToken(): Promise<string> {
    if (cachedToken && Date.now() < cachedToken.exp) return cachedToken.value;
    const data = await jsonFetch<{
      code?: number;
      msg?: string;
      tenant_access_token?: string;
      expire?: number;
    }>(`${domain}/open-apis/auth/v3/tenant_access_token/internal`, {
      method: "POST",
      body: JSON.stringify({ app_id: appId, app_secret: cfg.token }),
    });
    if (data.code !== 0 || !data.tenant_access_token) {
      throw new Error(`Feishu token: ${data.msg ?? data.code ?? "failed"}`);
    }
    cachedToken = {
      value: data.tenant_access_token,
      exp: Date.now() + Math.max(60, (data.expire ?? 7200) - 120) * 1000,
    };
    return cachedToken.value;
  }

  return {
    async start() {
      await tenantToken();
      registerWebhookListener(channelId, onMessage);
      return { botName: `feishu:${appId}` };
    },
    stop() {
      unregisterWebhookListener(channelId);
    },
    async send(chatId, text) {
      const token = await tenantToken();
      for (const part of chunkText(text, 4000)) {
        await jsonFetch(`${domain}/open-apis/im/v1/messages?receive_id_type=chat_id`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            receive_id: chatId,
            msg_type: "text",
            content: JSON.stringify({ text: part }),
          }),
        });
      }
    },
    async indicateTyping() {},
  };
}

export function createSessionStubAdapter(
  kind: string,
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const sessionDir = path.join(dataDirs.root, kind, cfg.token.trim() || "default");
  const inbox = path.join(sessionDir, "inbox.jsonl");
  let stopped = false;
  let offset = 0;

  async function watch(): Promise<void> {
    fs.mkdirSync(sessionDir, { recursive: true });
    if (!fs.existsSync(inbox)) fs.writeFileSync(inbox, "");
    while (!stopped) {
      try {
        const buf = fs.readFileSync(inbox, "utf8");
        if (buf.length > offset) {
          const chunk = buf.slice(offset);
          offset = buf.length;
          for (const line of chunk.split("\n")) {
            if (!line.trim()) continue;
            try {
              const m = JSON.parse(line) as InboundMessage;
              onMessage(m);
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 1_000));
    }
  }

  return {
    async start() {
      void watch();
      console.log(
        `[${kind}] session dir ${sessionDir} — drop inbound JSONL lines into inbox.jsonl; outbound → outbound.jsonl`,
      );
      return { botName: `${kind}:${cfg.token}` };
    },
    stop() {
      stopped = true;
    },
    async send(chatId, text) {
      fs.mkdirSync(sessionDir, { recursive: true });
      fs.appendFileSync(
        path.join(sessionDir, "outbound.jsonl"),
        JSON.stringify({ chatId, text, at: new Date().toISOString() }) + "\n",
      );
    },
    async indicateTyping() {},
  };
}
