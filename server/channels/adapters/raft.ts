/**
 * Raft wake-channel bridge — loopback /wake + spawn `raft agent bridge`
 * (OpenClaw raft/gateway.ts posture). Wake payloads must not carry message text.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { ChannelConfig } from "../../../shared/types.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { opt } from "./httpUtil.js";

const FORBIDDEN_CONTENT = new Set([
  "body",
  "content",
  "message",
  "messages",
  "preview",
  "snippet",
  "text",
]);
const EVENT_ID_FIELDS = [
  "eventId",
  "attemptId",
  "messageId",
  "delivery_id",
  "wake_id",
  "id",
] as const;

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function eventId(payload: Record<string, unknown>): string | undefined {
  for (const k of EVENT_ID_FIELDS) {
    const v = payload[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

export function createRaftAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const profile = opt(cfg, "profile") || cfg.token.trim() || "default";
  const token = randomBytes(32).toString("hex");
  let server: Server | null = null;
  let child: ChildProcess | null = null;
  let stopped = false;
  const seen = new Map<string, number>();

  function remember(id: string): boolean {
    const now = Date.now();
    for (const [k, t] of seen) if (now - t > 24 * 3600_000) seen.delete(k);
    if (seen.has(id)) return false;
    seen.set(id, now);
    return true;
  }

  async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
    const chunks: Buffer[] = [];
    let n = 0;
    for await (const c of req) {
      const b = Buffer.isBuffer(c) ? c : Buffer.from(c);
      n += b.length;
      if (n > 16 * 1024) throw Object.assign(new Error("too large"), { status: 413 });
      chunks.push(b);
    }
    const text = Buffer.concat(chunks).toString("utf8").trim();
    if (!text) return {};
    return JSON.parse(text) as Record<string, unknown>;
  }

  function writeJson(res: ServerResponse, status: number, body: unknown): void {
    const raw = JSON.stringify(body);
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(raw);
  }

  return {
    async start() {
      await new Promise<void>((resolve, reject) => {
        server = createServer(async (req, res) => {
          try {
            const url = new URL(req.url ?? "/", "http://127.0.0.1");
            if (req.method === "GET" && url.pathname === "/health") {
              writeJson(res, 200, { ok: true });
              return;
            }
            if (req.method === "GET" && url.pathname === "/activity/drain") {
              writeJson(res, 200, {
                schema: "raft-activity-drain.v1",
                events: [],
                dropped: 0,
              });
              return;
            }
            if (req.method === "POST" && url.pathname === "/wake") {
              const hdr = req.headers["x-raft-bridge-token"];
              if (typeof hdr !== "string" || !safeEqual(hdr, token)) {
                writeJson(res, 401, { error: "unauthorized" });
                return;
              }
              const payload = await readJson(req);
              for (const k of Object.keys(payload)) {
                if (FORBIDDEN_CONTENT.has(k)) {
                  writeJson(res, 400, {
                    error: `wake payload must not include content key "${k}"`,
                  });
                  return;
                }
              }
              const id = eventId(payload);
              if (!id) {
                writeJson(res, 400, { error: "wake missing event identity" });
                return;
              }
              const dup = !remember(id);
              if (!dup) {
                // Synthetic wake hint — Raft CLI owns real message fetch.
                onMessage({
                  chatId: `raft:${id}`,
                  label: "raft-wake",
                  text: `[raft wake] event ${id} — use raft CLI / tools for message content (wake payloads never carry text).`,
                  isGroup: false,
                  mentioned: true,
                });
              }
              writeJson(res, 202, {
                ok: true,
                accepted: !dup,
                duplicate: dup,
                runtimeSession: profile,
              });
              return;
            }
            writeJson(res, 404, { error: "not found" });
          } catch (err) {
            const status = (err as { status?: number }).status ?? 400;
            writeJson(res, status, {
              error: err instanceof Error ? err.message : "bad request",
            });
          }
        });
        server.listen(0, "127.0.0.1", () => {
          const addr = server?.address();
          if (!addr || typeof addr === "string") {
            reject(new Error("Raft wake server failed to bind"));
            return;
          }
          const endpoint = `http://127.0.0.1:${addr.port}/wake`;
          child = spawn(
            "raft",
            [
              "--profile",
              profile,
              "agent",
              "bridge",
              "--wake-adapter",
              "wake-channel",
              "--wake-channel-endpoint",
              endpoint,
            ],
            {
              env: { ...process.env, RAFT_CHANNEL_TOKEN: token },
              stdio: "ignore",
            },
          );
          child.on("error", (err) => {
            console.warn(
              "[raft] failed to spawn raft CLI — install/sign-in raft, or wake endpoint stays idle:",
              err.message,
            );
          });
          child.on("exit", (code) => {
            if (!stopped) console.warn(`[raft] bridge exited code=${code}`);
          });
          console.log(`[raft] wake endpoint ${endpoint} (profile=${profile})`);
          resolve();
        });
        server.on("error", reject);
      });
      return { botName: `raft:${profile}` };
    },
    stop() {
      stopped = true;
      try {
        child?.kill();
      } catch {
        /* ignore */
      }
      child = null;
      server?.close();
      server = null;
    },
    async send(chatId, text) {
      // Raft owns outbound messaging via CLI; log for operator visibility.
      console.log(`[raft] outbound hint ${chatId}: ${text.slice(0, 200)}`);
    },
    async indicateTyping() {},
  };
}
