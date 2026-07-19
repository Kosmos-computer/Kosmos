/**
 * Matrix adapter — /sync long-poll + room send (access token).
 * Unencrypted rooms only (no E2EE). Persists next_batch across restarts and
 * skips the first timeline after a cold start without a saved cursor.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { ChannelConfig } from "../../../shared/types.js";
import { dataDirs } from "../../env.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { chunkText, jsonFetch, opt } from "./httpUtil.js";

function sincePath(base: string, user: string): string {
  const key = createHash("sha256").update(`${base}\0${user}`).digest("hex").slice(0, 16);
  return path.join(dataDirs.root, "matrix", key, "since.txt");
}

export function createMatrixAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const base = opt(cfg, "baseUrl").replace(/\/+$/, "");
  const token = cfg.token;
  const userId = opt(cfg, "userId");
  if (!base || !token) throw new Error("Matrix requires token and options.baseUrl");
  let stopped = false;
  let since = "";
  let myUser = userId;
  let live = false;
  let sinceFile = "";

  function loadSince(): void {
    if (!sinceFile) return;
    try {
      if (fs.existsSync(sinceFile)) {
        since = fs.readFileSync(sinceFile, "utf8").trim();
        if (since) live = true; // resume mid-stream — process new events only
      }
    } catch {
      /* ignore */
    }
  }

  function saveSince(): void {
    if (!sinceFile || !since) return;
    try {
      fs.mkdirSync(path.dirname(sinceFile), { recursive: true });
      fs.writeFileSync(sinceFile, since);
    } catch {
      /* ignore */
    }
  }

  async function syncLoop(): Promise<void> {
    while (!stopped) {
      try {
        const filter = encodeURIComponent(
          JSON.stringify({ room: { timeline: { limit: 20, types: ["m.room.message"] } } }),
        );
        const url =
          `${base}/_matrix/client/v3/sync?timeout=30000&filter=${filter}` +
          (since ? `&since=${encodeURIComponent(since)}` : "");
        const data = await jsonFetch<{
          next_batch?: string;
          rooms?: {
            join?: Record<
              string,
              {
                timeline?: {
                  events?: Array<{
                    type: string;
                    sender: string;
                    content?: { body?: string; msgtype?: string; algorithm?: string };
                  }>;
                };
              }
            >;
          };
        }>(url, { token });
        if (data.next_batch) {
          since = data.next_batch;
          saveSince();
        }

        if (!live) {
          live = true;
          continue;
        }

        const joined = data.rooms?.join ?? {};
        for (const [roomId, room] of Object.entries(joined)) {
          for (const ev of room.timeline?.events ?? []) {
            if (ev.sender === myUser) continue;
            // OpenClaw warns when encryption is off; we refuse silently dropping E2EE.
            if (ev.type === "m.room.encrypted") {
              console.warn(
                `[matrix] encrypted event in ${roomId} — Kosmos has no E2EE (matrix-js-sdk crypto). Use unencrypted rooms or enable encryption in OpenClaw-style clients.`,
              );
              continue;
            }
            if (ev.type !== "m.room.message") continue;
            if (ev.content?.msgtype !== "m.text") continue;
            const text = (ev.content.body ?? "").trim();
            if (!text) continue;
            onMessage({
              chatId: roomId,
              label: ev.sender,
              text,
              isGroup: true,
              mentioned: true,
            });
          }
        }
      } catch (err) {
        if (stopped) return;
        console.warn("[matrix] sync error:", err instanceof Error ? err.message : err);
        await new Promise((r) => setTimeout(r, 5_000));
      }
    }
  }

  return {
    async start() {
      if (!myUser) {
        const who = await jsonFetch<{ user_id: string }>(`${base}/_matrix/client/v3/account/whoami`, {
          token,
        });
        myUser = who.user_id;
      }
      sinceFile = sincePath(base, myUser);
      loadSince();
      void syncLoop();
      return { botName: myUser };
    },
    stop() {
      stopped = true;
      saveSince();
    },
    async send(chatId, text) {
      for (const part of chunkText(text, 4000)) {
        const txn = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        await jsonFetch(
          `${base}/_matrix/client/v3/rooms/${encodeURIComponent(chatId)}/send/m.room.message/${txn}`,
          {
            method: "PUT",
            token,
            body: JSON.stringify({ msgtype: "m.text", body: part }),
          },
        );
      }
    },
    async indicateTyping(chatId) {
      await jsonFetch(
        `${base}/_matrix/client/v3/rooms/${encodeURIComponent(chatId)}/typing/${encodeURIComponent(myUser)}`,
        {
          method: "PUT",
          token,
          body: JSON.stringify({ typing: true, timeout: 10_000 }),
        },
      ).catch(() => {});
    },
  };
}
