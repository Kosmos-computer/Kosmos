/**
 * Bitsocial daemon supervisor — mirrors llamaEngine for the bitsocial-cli
 * PKC RPC process on :9138. Adopts an already-running daemon; otherwise spawns
 * bitsocial-cli when Social connects with the local default RPC URL.
 */
import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BITSOCIAL_DEFAULT_RPC } from "../social/adapters/bitsocial.js";
import { dataDirs } from "../env.js";

export type BitsocialDaemonPhase = "stopped" | "starting" | "running" | "error";

export interface BitsocialDaemonStatus {
  phase: BitsocialDaemonPhase;
  rpcUrl: string;
  binary: string;
  external?: boolean;
  detail?: string;
}

interface LaunchSpec {
  command: string;
  args: string[];
  label: string;
}

const LOG_LINES_MAX = 400;
const START_TIMEOUT_MS = 90_000;
const INSTALL_HINT =
  "Install Bitsocial CLI with `npm i -g @bitsocial/bitsocial-cli` (or add `@bitsocial/bitsocial-cli` to this repo), then retry — or run `npm run bitsocial`.";

let phase: BitsocialDaemonPhase = "stopped";
let child: ChildProcess | null = null;
let external = false;
let lastError: string | undefined;
let lastBinaryLabel = "bitsocial";
const logLines: string[] = [];
let startPromise: Promise<BitsocialDaemonStatus> | null = null;

function appendLog(chunk: Buffer | string): void {
  const text = typeof chunk === "string" ? chunk : chunk.toString("utf-8");
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    logLines.push(line);
    if (logLines.length > LOG_LINES_MAX) logLines.splice(0, logLines.length - LOG_LINES_MAX);
  }
}

function repoRoot(): string {
  // server/services → repo root
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

function existingFile(...candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** Resolve a launchable bitsocial-cli binary (env, local install, PATH, npx). */
export function resolveBitsocialLaunch(): LaunchSpec {
  if (process.env.ARCO_BITSOCIAL_BIN) {
    return { command: process.env.ARCO_BITSOCIAL_BIN, args: ["daemon"], label: process.env.ARCO_BITSOCIAL_BIN };
  }
  if (process.env.BITSOCIAL_CLI) {
    return { command: process.env.BITSOCIAL_CLI, args: ["daemon"], label: process.env.BITSOCIAL_CLI };
  }

  const root = repoRoot();
  const packageRun = existingFile(
    path.join(root, "node_modules", "@bitsocial", "bitsocial-cli", "bin", "run"),
  );
  if (packageRun) {
    return { command: process.execPath, args: [packageRun, "daemon"], label: packageRun };
  }

  const localBin = existingFile(path.join(root, "node_modules", ".bin", "bitsocial"));
  if (localBin) {
    return { command: localBin, args: ["daemon"], label: localBin };
  }

  const home = process.env.HOME ?? "";
  const globalBin = existingFile(
    path.join(home, ".nvm/versions/node", process.version.slice(1), "bin/bitsocial"),
    "/opt/homebrew/bin/bitsocial",
    "/usr/local/bin/bitsocial",
  );
  if (globalBin) {
    return { command: globalBin, args: ["daemon"], label: globalBin };
  }

  // Last resort: npx will download/run the package (first start can be slow).
  return {
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    args: ["--yes", "@bitsocial/bitsocial-cli@0.19.85", "daemon"],
    label: "npx @bitsocial/bitsocial-cli",
  };
}

/** @deprecated Prefer resolveBitsocialLaunch().label */
export function bitsocialBinary(): string {
  return resolveBitsocialLaunch().label;
}

export function bitsocialRpcUrl(): string {
  return (process.env.BITSOCIAL_RPC_URL ?? BITSOCIAL_DEFAULT_RPC).trim() || BITSOCIAL_DEFAULT_RPC;
}

/** True when the URL is the local default we are allowed to supervise. */
export function isManagedBitsocialRpcUrl(rpcUrl: string): boolean {
  try {
    const parsed = new URL(rpcUrl);
    const host = parsed.hostname;
    const local =
      host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
    const port = parsed.port || (parsed.protocol === "wss:" ? "443" : "80");
    return local && port === "9138";
  } catch {
    return false;
  }
}

function dataDir(): string {
  return path.join(dataDirs.root, "bitsocial");
}

async function rpcHealthy(rpcUrl = bitsocialRpcUrl(), timeoutMs = 2_500): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };

    const timer = setTimeout(() => finish(false), timeoutMs);
    let ws: WebSocket;
    try {
      ws = new WebSocket(rpcUrl);
    } catch {
      finish(false);
      return;
    }
    ws.addEventListener("open", () => finish(true));
    ws.addEventListener("error", () => finish(false));
    ws.addEventListener("close", () => {
      if (!settled) finish(false);
    });
  });
}

function spawnDaemon(spec: LaunchSpec): ChildProcess {
  const opts: SpawnOptions = {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PKC_DATA_PATH: dataDir(),
      BITSOCIAL_DATA_PATH: dataDir(),
    },
    // npx needs a shell-friendly PATH; keep cwd at repo root for local resolution.
    cwd: repoRoot(),
  };
  return spawn(spec.command, spec.args, opts);
}

export const bitsocialDaemon = {
  async status(): Promise<BitsocialDaemonStatus> {
    if (phase === "running" && external && !(await rpcHealthy())) {
      phase = "stopped";
      external = false;
    }
    if (phase === "running" && !external && !child) {
      phase = "stopped";
    }
    return {
      phase,
      rpcUrl: bitsocialRpcUrl(),
      binary: lastBinaryLabel,
      ...(external ? { external: true } : {}),
      ...(lastError ? { detail: lastError } : {}),
    };
  },

  logs(): string[] {
    return [...logLines];
  },

  async start(): Promise<BitsocialDaemonStatus> {
    if (phase === "running") return this.status();
    if (startPromise) return startPromise;

    startPromise = this._start().finally(() => {
      startPromise = null;
    });
    return startPromise;
  },

  async _start(): Promise<BitsocialDaemonStatus> {
    if (await rpcHealthy()) {
      external = true;
      phase = "running";
      lastError = undefined;
      return this.status();
    }

    const spec = resolveBitsocialLaunch();
    lastBinaryLabel = spec.label;
    fs.mkdirSync(dataDir(), { recursive: true });
    phase = "starting";
    external = false;
    lastError = undefined;
    appendLog(`starting bitsocial daemon via ${spec.label}`);

    let proc: ChildProcess;
    try {
      proc = spawnDaemon(spec);
    } catch (err) {
      phase = "error";
      lastError =
        err instanceof Error
          ? `${err.message}. ${INSTALL_HINT}`
          : `Could not spawn Bitsocial daemon. ${INSTALL_HINT}`;
      return this.status();
    }

    child = proc;
    let spawnFailed = false;
    proc.stdout?.on("data", appendLog);
    proc.stderr?.on("data", appendLog);
    proc.on("error", (err) => {
      spawnFailed = true;
      lastError = err.message.includes("ENOENT")
        ? `bitsocial binary not found (${spec.label}). ${INSTALL_HINT}`
        : `${err.message}. ${INSTALL_HINT}`;
      phase = "error";
      child = null;
    });
    proc.on("exit", (code, signal) => {
      if (child === proc) {
        child = null;
        if (phase === "starting" || phase === "running") {
          phase = code === 0 || code === null ? "stopped" : "error";
          if (phase === "error" && !lastError) {
            lastError = `bitsocial daemon exited early (code ${code ?? "null"}, signal ${signal ?? "none"}). ${INSTALL_HINT}`;
          }
        }
      }
    });

    // Give ENOENT a tick to surface before we wait on health.
    await new Promise((r) => setTimeout(r, 250));
    // `phase` may have been reassigned by the spawn/exit callbacks above during
    // the tick; cast so TS doesn't narrow it to the "starting" literal set below.
    if (spawnFailed || (phase as BitsocialDaemonPhase) === "error") {
      return this.status();
    }

    const deadline = Date.now() + START_TIMEOUT_MS;
    while (phase === "starting" && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
      if (await rpcHealthy()) {
        phase = "running";
        lastError = undefined;
        break;
      }
    }
    if (phase === "starting") {
      phase = "error";
      lastError =
        lastError ||
        `bitsocial daemon did not become healthy at ${bitsocialRpcUrl()} within ${START_TIMEOUT_MS / 1000}s. ${INSTALL_HINT}`;
      try {
        proc.kill();
      } catch {
        /* ignore */
      }
      child = null;
    }
    return this.status();
  },

  /** Start unless already running — used when connecting with the local default RPC. */
  async ensureRunning(): Promise<BitsocialDaemonStatus> {
    if (phase === "running") {
      if (external ? await rpcHealthy() : child !== null) return this.status();
      // Stale "running" — fall through and restart.
      phase = "stopped";
      external = false;
    }
    if (phase === "starting" && startPromise) return startPromise;
    // Allow retry after a previous error.
    if (phase === "error") {
      phase = "stopped";
    }
    return this.start();
  },

  async stop(): Promise<BitsocialDaemonStatus> {
    if (external) {
      external = false;
      phase = "stopped";
      return this.status();
    }
    if (child) {
      const proc = child;
      child = null;
      proc.kill();
    }
    phase = "stopped";
    return this.status();
  },

  dispose(): void {
    if (child) child.kill();
    child = null;
    phase = "stopped";
    external = false;
  },
};
