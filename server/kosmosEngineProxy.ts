/**
 * Door from the desktop iframe to a loopback `kosmos serve`.
 *
 * The frame page speaks protocol v1 and asks for `screenshot` in a loop, so
 * the window is a stream of stills rather than one shot. This process opens
 * the engine socket so the engine port never has to be reachable from a
 * browser on another machine. Only `screenshot` is forwarded. The agent
 * drives the sim through `portal_control` on the server, not through this
 * socket: `load`, `step`, `command` and `quit` from the browser are dropped,
 * and `path` is stripped so the engine does not write a file. The upgrade
 * still needs an Arco session.
 *
 * A closed engine port on this host does not refuse the TCP connect; it
 * hangs. The upstream attempt gives up after {@link ENGINE_UPSTREAM_TIMEOUT_MS}
 * so the page can say the engine is down instead of sitting on "Connected".
 */
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer } from "ws";
import { AUTH_COOKIE } from "./auth/middleware.js";
import { authSessionStore } from "./auth/sessionStore.js";
import { userStore } from "./auth/userStore.js";
import { KOSMOS_ENGINE_PROXY_PATH } from "../shared/kosmosFrame.js";

const DEFAULT_ENGINE_WS = "ws://127.0.0.1:5800";

/** How long to wait for `kosmos serve` before telling the iframe it is down. */
export const ENGINE_UPSTREAM_TIMEOUT_MS = 2000;

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
      let gaveUp = false;

      const fail = (msg: string) => {
        if (gaveUp) return;
        gaveUp = true;
        clearTimeout(timer);
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ t: "error", id: null, code: "io_error", msg }));
          client.close();
        }
        upstream.close();
      };

      // Nothing listening on this host drops the SYN instead of refusing it.
      const timer = setTimeout(
        () => fail("kosmos serve is not reachable on loopback"),
        ENGINE_UPSTREAM_TIMEOUT_MS,
      );

      upstream.on("open", () => {
        clearTimeout(timer);
        for (const line of queued) upstream.send(line);
        queued.length = 0;
      });
      upstream.on("message", (data, isBinary) => {
        if (client.readyState !== WebSocket.OPEN) return;
        client.send(data, { binary: isBinary });
      });
      upstream.on("error", () => fail("kosmos serve is not reachable on loopback"));
      upstream.on("close", () => {
        clearTimeout(timer);
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
  console.log(`[kosmos-frame] stream proxy at ${KOSMOS_ENGINE_PROXY_PATH}`);
}
