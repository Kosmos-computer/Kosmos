/**
 * One engine session for the OS chat.
 *
 * The game window and the protocol are the same port when the window was
 * started with `--serve-port`. Headless hosts (the telepathy box has no
 * display) attach to `kosmos serve` instead, or report that nothing is
 * listening. This module never embeds OpenHands and never talks to Plane;
 * those are separate connections the bridge status only names.
 *
 * A session we started is the only one `close` stops. Attaching to a port
 * that was already up leaves that process running.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import WebSocket from "ws";
import { mcpServerStore } from "../mcp/serverStore.js";

const READ_REQUESTS = new Set(["query", "hash", "describe", "list_commands"]);

export function isReadRequest(t: string): boolean {
  return READ_REQUESTS.has(t);
}

export interface EngineStatus {
  listening: boolean;
  url: string;
  port: number;
  owned: boolean;
  window: boolean;
  windowNote?: string;
  error?: string;
}

export interface BridgeStatus {
  engine: EngineStatus;
  openhands: { configured: boolean; host: string | null };
  plane: { configured: boolean };
  github: { configured: boolean };
  engineMcp: boolean;
}

interface Started {
  pid: number;
  kill: () => void;
}

export interface EngineHooks {
  probe(host: string, port: number): Promise<boolean>;
  start(command: string, args: string[]): Started;
  lookup(bin: string): string | null;
}

let hooks: EngineHooks = {
  probe: probeTcp,
  start: startChild,
  lookup: lookupOnPath,
};

/** Tests replace process spawn and port probes. Pass null to restore. */
export function setEngineHooks(next: EngineHooks | null): void {
  hooks = next ?? { probe: probeTcp, start: startChild, lookup: lookupOnPath };
}

let owned: { pid: number; port: number; kill: () => void } | null = null;

export function resetEngineForTests(): void {
  owned = null;
  setEngineHooks(null);
}

function portOf(): number {
  const n = Number(process.env.KOSMOS_ENGINE_PORT ?? 5800);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : 5800;
}

/** `ws://host:port` from KOSMOS_ENGINE_URL, otherwise the local serve port. */
export function engineEndpoint(): { url: string; host: string; port: number } {
  const raw = process.env.KOSMOS_ENGINE_URL?.trim();
  if (raw) {
    const parsed = new URL(raw);
    const port = parsed.port ? Number(parsed.port) : parsed.protocol === "wss:" ? 443 : 80;
    return { url: raw, host: parsed.hostname, port };
  }
  const port = portOf();
  return { url: `ws://127.0.0.1:${port}`, host: "127.0.0.1", port };
}

function hasDisplay(): boolean {
  if (process.env.KOSMOS_ENGINE_WINDOW === "0") return false;
  if (process.env.KOSMOS_ENGINE_WINDOW === "1") return true;
  if (process.platform === "darwin") return true;
  return Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
}

function probeTcp(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(400);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });
}

function lookupOnPath(bin: string): string | null {
  if (bin.includes(path.sep) || bin.includes("/")) {
    return fs.existsSync(bin) ? bin : null;
  }
  const dirs = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    const full = path.join(dir, bin);
    try {
      fs.accessSync(full, fs.constants.X_OK);
      return full;
    } catch {
      // next dir
    }
  }
  return null;
}

function startChild(command: string, args: string[]): Started {
  const child: ChildProcess = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  const pid = child.pid;
  if (!pid) throw new Error(`failed to start ${command}`);
  return {
    pid,
    kill: () => {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // already gone
      }
    },
  };
}

function serveBin(): string {
  return process.env.KOSMOS_SERVE_BIN?.trim() || "kosmos";
}

function appBin(): string {
  return process.env.KOSMOS_APP_BIN?.trim() || "kosmos-app";
}

function mcpBin(): string {
  return process.env.KOSMOS_MCP_BIN?.trim() || "kosmos-mcp";
}

/**
 * Register the stdio MCP adapter once a session is up, so the chat sees
 * `mcp__kosmos-engine__*` next to the engine_* tools. Skipped when the
 * binary is not installed (the intents still work over the WebSocket).
 */
function ensureEngineMcp(port: number): boolean {
  const bin = hooks.lookup(mcpBin());
  if (!bin) return false;
  if (mcpServerStore.list().some((s) => s.id === "kosmos-engine")) return true;
  mcpServerStore.add({
    name: "Kosmos Engine",
    transport: {
      kind: "stdio",
      command: bin,
      args: ["--connect", String(port)],
    },
  });
  return true;
}

async function waitUntilUp(host: string, port: number): Promise<boolean> {
  for (let i = 0; i < 20; i++) {
    if (await hooks.probe(host, port)) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

export async function engineStatus(): Promise<EngineStatus> {
  const ep = engineEndpoint();
  const listening = await hooks.probe(ep.host, ep.port);
  return {
    listening,
    url: ep.url,
    port: ep.port,
    owned: owned?.port === ep.port,
    window: hasDisplay() && Boolean(hooks.lookup(appBin())),
  };
}

export async function bridgeStatus(): Promise<BridgeStatus> {
  const engine = await engineStatus();
  const planeUrl = process.env.ARCO_PLANE_MCP_URL?.trim();
  const planeToken = process.env.ARCO_PLANE_MCP_TOKEN?.trim() || process.env.PLANE_PAT?.trim();
  const github = Boolean(process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim());
  return {
    engine,
    openhands: {
      configured: Boolean(process.env.OPENHANDS_HOST?.trim()),
      host: process.env.OPENHANDS_HOST?.trim() || null,
    },
    plane: { configured: Boolean(planeUrl && planeToken) },
    github: { configured: github },
    engineMcp: Boolean(hooks.lookup(mcpBin())),
  };
}

/**
 * Attach, or start the window (when a display and kosmos-app exist) or
 * `kosmos serve`. KOSMOS_ENGINE_SPAWN=0 never starts a process.
 */
export async function openEngine(): Promise<EngineStatus> {
  const ep = engineEndpoint();
  if (await hooks.probe(ep.host, ep.port)) {
    ensureEngineMcp(ep.port);
    return { ...(await engineStatus()), windowNote: "attached to the port that was already listening" };
  }
  if (process.env.KOSMOS_ENGINE_SPAWN === "0") {
    return {
      ...(await engineStatus()),
      error: `nothing is listening at ${ep.url}. Start kosmos serve, or unset KOSMOS_ENGINE_SPAWN.`,
    };
  }

  const wantWindow = hasDisplay();
  const app = wantWindow ? hooks.lookup(appBin()) : null;
  const serve = hooks.lookup(serveBin());
  let command: string | null = null;
  let args: string[] = [];
  let windowNote: string | undefined;

  if (app) {
    command = app;
    args = ["--serve-port", String(ep.port)];
    windowNote = "started the game window";
  } else if (serve) {
    command = serve;
    args = ["serve", "--port", String(ep.port)];
    const scene = process.env.KOSMOS_ENGINE_SCENE?.trim();
    if (scene) args.push("--scene", scene);
    windowNote = wantWindow
      ? "no kosmos-app on PATH; started the headless server instead of a window"
      : "no display; started the headless server";
  } else {
    return {
      ...(await engineStatus()),
      error: "kosmos-app and kosmos are not on PATH. Install the engine CLI or set KOSMOS_APP_BIN / KOSMOS_SERVE_BIN.",
    };
  }

  const started = hooks.start(command, args);
  owned = { pid: started.pid, port: ep.port, kill: started.kill };
  const up = await waitUntilUp(ep.host, ep.port);
  if (!up) {
    started.kill();
    owned = null;
    return {
      ...(await engineStatus()),
      error: `${path.basename(command)} exited before ${ep.url} accepted a connection`,
    };
  }
  ensureEngineMcp(ep.port);
  return { ...(await engineStatus()), window: Boolean(app), windowNote };
}

/** Stop a server this module started. An attached server is left running. */
export async function closeEngine(): Promise<{ stopped: boolean; reason: string }> {
  if (!owned) {
    return { stopped: false, reason: "attached to an existing server; left it running" };
  }
  owned.kill();
  owned = null;
  return { stopped: true, reason: "stopped the server this session started" };
}

function asRequest(params: Record<string, unknown>): Record<string, unknown> {
  const request = params.request;
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new Error("request must be an object with a string t");
  }
  const t = (request as { t?: unknown }).t;
  if (typeof t !== "string" || !t) throw new Error("request.t must be a string");
  return request as Record<string, unknown>;
}

/**
 * One protocol round trip. The server sends a banner with id null first;
 * we wait for the reply that echoes our id.
 */
export function protocolCall(url: string, request: Record<string, unknown>, timeoutMs = 8000): Promise<unknown> {
  const id = request.id ?? 1;
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("engine protocol timed out"));
    }, timeoutMs);
    const finish = (err: Error | null, value?: unknown) => {
      clearTimeout(timer);
      ws.close();
      if (err) reject(err);
      else resolve(value);
    };
    ws.on("error", (err) => finish(err instanceof Error ? err : new Error(String(err))));
    ws.on("open", () => ws.send(JSON.stringify({ ...request, id })));
    ws.on("message", (data) => {
      let msg: { id?: unknown };
      try {
        msg = JSON.parse(data.toString()) as { id?: unknown };
      } catch {
        return;
      }
      if (msg.id !== id) return;
      finish(null, msg);
    });
  });
}

export async function engineQuery(params: Record<string, unknown>): Promise<unknown> {
  const request = asRequest(params);
  const t = String(request.t);
  if (!isReadRequest(t)) {
    throw new Error(`engine.query only allows ${[...READ_REQUESTS].join(", ")}; use engine.call for ${t}`);
  }
  const ep = engineEndpoint();
  if (!(await hooks.probe(ep.host, ep.port))) {
    throw new Error(`engine is not listening at ${ep.url}`);
  }
  return protocolCall(ep.url, request);
}

export async function engineCall(params: Record<string, unknown>): Promise<unknown> {
  const request = asRequest(params);
  const ep = engineEndpoint();
  if (!(await hooks.probe(ep.host, ep.port))) {
    throw new Error(`engine is not listening at ${ep.url}`);
  }
  return protocolCall(ep.url, request);
}
