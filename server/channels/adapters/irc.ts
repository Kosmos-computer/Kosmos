/**
 * IRC adapter — TLS/plain TCP, channels + PRIVMSG DMs.
 * Waits for numeric 001 (welcome) before JOIN, matching real IRC/Twitch servers.
 */
import net from "node:net";
import tls from "node:tls";
import type { ChannelConfig } from "../../../shared/types.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { opt } from "./httpUtil.js";

export function createIrcAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const host = opt(cfg, "host");
  const nick = cfg.token.trim();
  if (!host || !nick) throw new Error("IRC requires nick (token) and options.host");
  const port = Number(opt(cfg, "port", "6697")) || 6697;
  const useTls = opt(cfg, "tls", "true") !== "false";
  const password = opt(cfg, "password") || undefined;
  const joinList = opt(cfg, "channels")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  let socket: net.Socket | null = null;
  let stopped = false;
  let buf = "";
  let registered = false;

  function write(line: string): void {
    socket?.write(line + "\r\n");
  }

  function joinChannels(): void {
    for (const ch of joinList) write(`JOIN ${ch}`);
  }

  function handleLine(line: string): void {
    if (line.startsWith("PING ")) {
      write("PONG " + line.slice(5));
      return;
    }
    // Numeric replies: ":server 001 nick :Welcome…"
    const num = line.match(/^:\S+\s+(\d{3})\s+/);
    if (num) {
      const code = num[1];
      if (code === "001" && !registered) {
        registered = true;
        joinChannels();
      }
      if (code === "433") {
        console.warn(`[irc] nick ${nick} already in use`);
      }
      if (code === "464" || code === "465") {
        console.warn(`[irc] authentication failed (${code})`);
      }
      return;
    }
    // :nick!user@host PRIVMSG #chan :text
    const m = line.match(/^:([^!\s]+)![^\s]+ PRIVMSG (\S+) :(.*)$/);
    if (!m) return;
    const [, from, target, text] = m;
    const isGroup = target.startsWith("#");
    const chatId = isGroup ? target : from;
    const mentioned =
      !isGroup ||
      new RegExp(`(^|[,\\s])${nick.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([,\\s]|$)`, "i").test(
        text,
      );
    onMessage({
      chatId,
      label: from,
      text,
      isGroup,
      mentioned: isGroup ? mentioned : true,
    });
  }

  return {
    async start() {
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const readyTimer = setTimeout(() => {
          if (!settled) {
            settled = true;
            reject(new Error(`IRC: no welcome (001) from ${host}:${port}`));
          }
        }, 30_000);

        const onConnect = () => {
          if (password) write(`PASS ${password}`);
          write(`NICK ${nick}`);
          write(`USER ${nick} 0 * :Kosmos`);
          // JOIN only after 001 — see handleLine
        };

        const finishOk = () => {
          if (settled) return;
          settled = true;
          clearTimeout(readyTimer);
          resolve();
        };

        if (useTls) {
          socket = tls.connect({ host, port, servername: host }, onConnect);
        } else {
          socket = net.connect({ host, port }, onConnect);
        }
        socket.setEncoding("utf8");
        socket.on("data", (chunk: string) => {
          buf += chunk;
          const parts = buf.split(/\r?\n/);
          buf = parts.pop() ?? "";
          for (const line of parts) {
            if (!line) continue;
            const before = registered;
            handleLine(line);
            if (!before && registered) finishOk();
          }
        });
        socket.on("error", (err) => {
          if (!settled) {
            settled = true;
            clearTimeout(readyTimer);
            reject(err);
          }
        });
        socket.on("close", () => {
          if (!stopped && !settled) {
            settled = true;
            clearTimeout(readyTimer);
            reject(new Error("IRC connection closed before registration"));
          }
        });
      });
      return { botName: nick };
    },
    stop() {
      stopped = true;
      try {
        write("QUIT :kosmos");
        socket?.destroy();
      } catch {
        /* ignore */
      }
      socket = null;
    },
    async send(chatId, text) {
      for (const line of text.split("\n")) {
        const safe = line.slice(0, 400) || " ";
        write(`PRIVMSG ${chatId} :${safe}`);
      }
    },
    async indicateTyping() {},
  };
}
