/**
 * Zalo personal (zca-js) — QR login, OpenClaw zalouser client.
 */
import fs from "node:fs";
import path from "node:path";
import type { ChannelConfig } from "../../../shared/types.js";
import { dataDirs } from "../../env.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { chunkText } from "./httpUtil.js";
import { createZalo, type API, type Credentials } from "../ported/zalouser/zca-client.js";

export function createZalouserAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const sessionId = cfg.token.trim() || "default";
  const sessionDir = path.join(dataDirs.root, "zalouser", sessionId);
  const credPath = path.join(sessionDir, "credentials.json");
  let api: API | null = null;
  let stopped = false;
  /** Threads observed as Group (zca ThreadType=1). */
  const groupThreads = new Set<string>();

  return {
    async start() {
      fs.mkdirSync(sessionDir, { recursive: true });
      const zalo = await createZalo({ selfListen: false, logging: false });
      if (fs.existsSync(credPath)) {
        const creds = JSON.parse(fs.readFileSync(credPath, "utf8")) as Credentials;
        api = await zalo.login(creds);
        console.log("[zalouser] logged in from saved credentials");
      } else {
        console.log("[zalouser] Scan QR — credentials will be saved to", credPath);
        api = await zalo.loginQR({ qrPath: path.join(sessionDir, "qr.png") }, (ev) => {
          // type 0 = QR image ready; type 4 = credentials after scan.
          if (ev.type === 0) {
            console.log("[zalouser] QR ready — open", path.join(sessionDir, "qr.png"));
          }
          if (ev.type === 4 && ev.data) {
            fs.writeFileSync(
              credPath,
              JSON.stringify({
                imei: ev.data.imei,
                cookie: ev.data.cookie,
                userAgent: ev.data.userAgent,
              }),
            );
          }
        });
      }
      const ownId = api.getOwnId();
      api.listener.on("message", (message) => {
        if (stopped) return;
        try {
          const data = message.data as {
            content?: string | { title?: string };
            dName?: string;
            uidFrom?: string;
          };
          const text =
            typeof data.content === "string"
              ? data.content
              : data.content?.title ?? "";
          if (!text.trim()) return;
          // zca-js: ThreadType.Group === 1
          const isGroup = message.type === 1;
          const chatId = String(message.threadId ?? data.uidFrom ?? "");
          if (!chatId) return;
          if (String(data.uidFrom) === String(ownId)) return;
          if (isGroup) groupThreads.add(chatId);
          onMessage({
            chatId,
            label: data.dName || data.uidFrom || chatId,
            text: text.trim(),
            isGroup,
            mentioned: true,
          });
        } catch (err) {
          console.warn("[zalouser] message:", err instanceof Error ? err.message : err);
        }
      });
      api.listener.start({ retryOnClose: true });
      return { botName: `zalouser:${ownId}` };
    },
    stop() {
      stopped = true;
      try {
        api?.listener.stop();
      } catch {
        /* ignore */
      }
      api = null;
    },
    async send(chatId, text) {
      if (!api) throw new Error("Zalouser not connected");
      const tid = chatId.replace(/^group:/, "");
      const threadType = chatId.startsWith("group:") || groupThreads.has(tid) ? 1 : 0;
      for (const part of chunkText(text, 2000)) {
        await api.sendMessage(part, tid, threadType);
      }
    },
    async indicateTyping(chatId) {
      const tid = chatId.replace(/^group:/, "");
      const threadType = chatId.startsWith("group:") || groupThreads.has(tid) ? 1 : 0;
      await api?.sendTypingEvent(tid, threadType).catch(() => {});
    },
  };
}
