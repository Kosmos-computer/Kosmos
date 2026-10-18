/**
 * Door from the desktop to a loopback `kosmos serve`.
 *
 * The frame page speaks protocol v1. This process opens the engine socket so
 * the engine port never has to be reachable from a browser on another machine.
 * Only `screenshot` is forwarded. `load`, `step`, `command` and `quit` would
 * let a desktop session drive the sim or stop it, and `path` would write a
 * file, so those are dropped here. The upgrade still needs an Arco session.
 */
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer } from "ws";
import { AUTH_COOKIE } from "./auth/middleware.js";
import { authSessionStore } from "./auth/sessionStore.js";
import { userStore } from "./auth/userStore.js";
import { KOSMOS_ENGINE_PROXY_PATH } from "../shared/kosmosFrame.js";

const DEFAULT_ENGINE_WS = "ws://127.0.0.1:5800";

/** Pull one cookie value out of a raw `Cookie` header. */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

/**
 * The upstream must be loopback. A public `KOSMOS_ENGINE_WS` would turn this
 * proxy into a tunnel off the machine.
 */
export function engineWsUrl(raw = process.env.KOSMOS_ENGINE_WS ?? DEFAULT_ENGINE_WS): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("KOSMOS_ENGINE_WS is not a URL");
  }
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error("KOSMOS_ENGINE_WS must be a WebSocket URL");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") {
    throw new Error("KOSMOS_ENGINE_WS must be loopback");
  }
  return url.toString();
}

/**
 * Keep a `screenshot` request and force inline delivery. Returns null when
 * the text is not that one request. `path` is removed so the engine does not
 * write a file on behalf of the browser.
 */
export function frameRequest(text: string): string | null {
  let msg: unknown;
  try {
    msg = JSON.parse(text);
  } catch {
    return null;
  }
  if (!msg || typeof msg !== "object" || Array.isArray(msg)) return null;
  const rec = msg as Record<string, unknown>;
  if (rec.t !== "screenshot") return null;
  delete rec.path;
  rec.inline = true;
  return JSON.stringify(rec);
}

/** A live, unlocked shell session. The frame page is same-site with the desktop, so the cookie is sent. */
export function upgradeSessionOk(cookieHeader: string | undefined): boolean {
  const token = readCookie(cookieHeader, AUTH_COOKIE);
  if (!token) return false;
  const session = authSessionStore.get(token);
  if (!session || session.locked) return false;
  return userStore.getAuthUser(session.userId) != null;
}

function rejectUpgrade(socket: Duplex, status: number, reason: string): void {
  socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  socket.destroy();
}

/**
 * Attach the proxy to the shell's HTTP server. Other upgrade paths (voice)
 * are left alone: this handler returns when the path is not `/api/kosmos`.
 */
export function attachKosmosEngineProxy(httpServer: Server): void {
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    let pathname = "/";
    try {
      pathname = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
    } catch {
      return;
    }
    if (pathname !== KOSMOS_ENGINE_PROXY_PATH) return;

    if (!upgradeSessionOk(req.headers.cookie)) {
      rejectUpgrade(socket, 401, "Unauthorized");
      return;
    }

    let upstreamUrl: string;
    try {
      upstreamUrl = engineWsUrl();
    } catch (err) {
      console.warn("[kosmos-frame]", err instanceof Error ? err.message : err);
      rejectUpgrade(socket, 500, "Bad Gateway");
      return;
    }

    wss.handleUpgrade(req, socket, head, (client) => {
      // Origin is a loopback name so `kosmos serve` accepts the handshake.
      // Host comes from the URL, which is the bound engine port.
      const upstream = new WebSocket(upstreamUrl, { origin: "http://127.0.0.1" });
      const queued: string[] = [];

      const fail = (msg: string) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ t: "error", id: null, code: "io_error", msg }));
          client.close();
        }
        upstream.close();
      };

      upstream.on("open", () => {
        for (const line of queued) upstream.send(line);
        queued.length = 0;
      });
      upstream.on("message", (data, isBinary) => {
        if (client.readyState !== WebSocket.OPEN) return;
        client.send(data, { binary: isBinary });
      });
      upstream.on("error", () => fail("kosmos serve is not reachable on loopback"));
      upstream.on("close", () => {
        if (client.readyState === WebSocket.OPEN) client.close();
      });

      client.on("message", (data, isBinary) => {
        if (isBinary) return;
        const forwarded = frameRequest(String(data));
        if (!forwarded) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              t: "error",
              id: null,
              code: "bad_request",
              msg: "This window only forwards screenshot.",
            }));
          }
          return;
        }
        if (upstream.readyState === WebSocket.OPEN) upstream.send(forwarded);
        else if (upstream.readyState === WebSocket.CONNECTING) queued.push(forwarded);
      });
      client.on("close", () => upstream.close());
      client.on("error", () => upstream.close());
    });
  });
  console.log(`[kosmos-frame] screenshot proxy at ${KOSMOS_ENGINE_PROXY_PATH}`);
}
