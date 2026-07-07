/**
 * Local model engine — a Node port of the model-manager Tauri supervisor
 * (model-manager/src-tauri/src/main.rs), so the OS itself can host models:
 * download GGUFs with progress, generate presets.ini, and supervise
 * `llama-server` in router mode on :4650.
 *
 * The GGUF store is shared with the legacy Tauri app (same platform data
 * dir), so already-downloaded models are reused. If another supervisor is
 * already serving the port (the Tauri app), we adopt it as an "external"
 * engine instead of fighting over the port.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import {
  LOCAL_ENGINE_PORT,
  type EngineModelState,
  type EnginePhase,
  type EngineStatus,
  type ModelManifest,
} from "../../shared/models.js";
import { modelStore } from "../stores/modelStore.js";

const ROUTER_URL = `http://127.0.0.1:${LOCAL_ENGINE_PORT}`;
/** Router keeps at most this many models resident (llama-server --models-max). */
const MODELS_MAX = 2;
const LOG_LINES_MAX = 500;

/** Same layout as the Tauri app: <platform data dir>/arco-models/{models,presets.ini}. */
function rootDir(): string {
  if (process.env.ARCO_MODELS_DIR) return path.resolve(process.env.ARCO_MODELS_DIR);
  const home = os.homedir();
  if (process.platform === "darwin") return path.join(home, "Library", "Application Support", "arco-models");
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA ?? path.join(home, "AppData", "Roaming"), "arco-models");
  }
  return path.join(process.env.XDG_DATA_HOME ?? path.join(home, ".local", "share"), "arco-models");
}

function modelsDir(): string {
  return path.join(rootDir(), "models");
}

function presetPath(): string {
  return path.join(rootDir(), "presets.ini");
}

/** The llama-server binary: env override first, then Homebrew, then PATH. */
function engineBinary(): string {
  if (process.env.ARCO_LLAMA_SERVER) return process.env.ARCO_LLAMA_SERVER;
  const brew = "/opt/homebrew/bin/llama-server";
  if (fs.existsSync(brew)) return brew;
  return "llama-server";
}

// ── presets.ini (port of model-manager/src/lib/presets.ts) ──────────────────

/**
 * Apple Silicon fast path applied to every model: full Metal offload, Flash
 * Attention, q8_0 KV cache, 32k context (Arco's system prompt alone is ~19k
 * tokens and the agent transcript grows every tool iteration).
 */
const GLOBAL_TUNING: Record<string, string> = {
  "n-gpu-layers": "99",
  "flash-attn": "on",
  "cache-type-k": "q8_0",
  "cache-type-v": "q8_0",
  c: "32768",
};

function iniSection(name: string, entries: Record<string, string>): string {
  const body = Object.entries(entries)
    .map(([k, v]) => `${k} = ${v}`)
    .join("\n");
  return `[${name}]\n${body}\n`;
}

type GgufManifest = ModelManifest & { runtime: Extract<ModelManifest["runtime"], { kind: "llama-gguf" }> };

/** Every registered llama-gguf manifest — the registry replaces catalog.ts here. */
function ggufManifests(): GgufManifest[] {
  return modelStore
    .list()
    .map((m) => m.manifest)
    .filter((m): m is GgufManifest => m.runtime.kind === "llama-gguf");
}

function localFiles(): Set<string> {
  try {
    return new Set(fs.readdirSync(modelsDir()).filter((f) => f.toLowerCase().endsWith(".gguf")));
  } catch {
    return new Set();
  }
}

/**
 * Presets reference downloaded files only: llama-server refuses to start a
 * model whose GGUF (or draft GGUF) is missing.
 */
function buildPresetIni(present: Set<string>): string {
  const sections: string[] = ["version = 1\n", iniSection("*", GLOBAL_TUNING)];
  for (const manifest of ggufManifests()) {
    const rt = manifest.runtime;
    if (!present.has(rt.file) || !rt.presetExtras) continue;
    const extras: Record<string, string> = {};
    for (const [k, v] of Object.entries(rt.presetExtras)) {
      // Skip the speculative-decoding pairing when the draft isn't downloaded.
      if (k === "model-draft" && (!rt.draft || !present.has(rt.draft.file))) continue;
      extras[k] = v.replace("@MODELS_DIR@", modelsDir());
    }
    if (Object.keys(extras).length > 0) {
      sections.push(iniSection(rt.file.replace(/\.gguf$/i, ""), extras));
    }
  }
  return sections.join("\n");
}

// ── Supervision ──────────────────────────────────────────────────────────────

type DownloadState =
  | { state: "downloading"; receivedBytes: number; totalBytes: number }
  | { state: "error"; error: string };

let child: ChildProcess | null = null;
let phase: EnginePhase = "stopped";
let external = false;
let lastError: string | undefined;
const logLines: string[] = [];
/** Keyed by GGUF filename (drafts download under their own name). */
const downloads = new Map<string, DownloadState>();

function appendLog(chunk: Buffer | string): void {
  for (const line of String(chunk).split("\n")) {
    if (!line.trim()) continue;
    logLines.push(line);
    while (logLines.length > LOG_LINES_MAX) logLines.shift();
  }
}

async function routerHealthy(timeoutMs = 1_500): Promise<boolean> {
  try {
    const res = await fetch(`${ROUTER_URL}/health`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Router-side model states ("loaded", "loading", …) keyed by model id (file stem). */
async function routerModelStates(): Promise<Map<string, string>> {
  const states = new Map<string, string>();
  try {
    const res = await fetch(`${ROUTER_URL}/models`, { signal: AbortSignal.timeout(2_000) });
    if (!res.ok) return states;
    const body = (await res.json()) as { data?: Array<{ id?: string; status?: { value?: string } }> };
    for (const m of body.data ?? []) {
      if (m.id) states.set(m.id, m.status?.value ?? "stopped");
    }
  } catch {
    // Router gone mid-request — status() will reflect that on its next probe.
  }
  return states;
}

export const llamaEngine = {
  /** Start the router (or adopt an already-running one). Resolves when healthy. */
  async start(): Promise<EngineStatus> {
    if (phase === "running" || phase === "starting") return this.status();

    if (await routerHealthy()) {
      external = true;
      phase = "running";
      lastError = undefined;
      return this.status();
    }

    fs.mkdirSync(modelsDir(), { recursive: true });
    fs.writeFileSync(presetPath(), buildPresetIni(localFiles()), "utf-8");

    phase = "starting";
    external = false;
    lastError = undefined;
    const proc = spawn(
      engineBinary(),
      [
        "--host", "127.0.0.1",
        "--port", String(LOCAL_ENGINE_PORT),
        "--models-dir", modelsDir(),
        "--models-preset", presetPath(),
        "--models-max", String(MODELS_MAX),
        "--jinja",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    child = proc;
    proc.stdout?.on("data", appendLog);
    proc.stderr?.on("data", appendLog);
    proc.on("error", (err) => {
      // Covers ENOENT (llama-server not installed) — surface it honestly.
      lastError = err.message.includes("ENOENT")
        ? `llama-server binary not found (${engineBinary()}). Install it (brew install llama.cpp) or set ARCO_LLAMA_SERVER.`
        : err.message;
      phase = "error";
      child = null;
    });
    proc.on("exit", (code) => {
      if (child === proc) {
        child = null;
        if (phase !== "error") {
          phase = code === 0 || code === null ? "stopped" : "error";
          if (phase === "error") lastError = `llama-server exited with code ${code}`;
        }
      }
    });

    // Wait (up to 20s) for the router to come up; model loads happen lazily.
    for (let i = 0; i < 40 && phase === "starting"; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await routerHealthy()) {
        phase = "running";
        break;
      }
    }
    if (phase === "starting") {
      phase = "error";
      lastError = "llama-server did not become healthy within 20s";
      proc.kill();
      child = null;
    }
    return this.status();
  },

  /** Start unless already running — used when a local model gets assigned. */
  async ensureRunning(): Promise<void> {
    if (phase === "running" && (external ? await routerHealthy() : child !== null)) return;
    if (phase === "starting") return;
    await this.start();
  },

  async stop(): Promise<EngineStatus> {
    if (external) {
      // Not ours to kill — the Tauri app owns it. Just stop routing to it.
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

  async status(): Promise<EngineStatus> {
    // Detect silent death / external router appearing without start().
    if (phase === "running" && external && !(await routerHealthy())) {
      phase = "stopped";
      external = false;
    }

    const present = localFiles();
    const routerStates = phase === "running" ? await routerModelStates() : new Map<string, string>();
    const models: Record<string, EngineModelState> = {};
    for (const manifest of ggufManifests()) {
      const rt = manifest.runtime;
      const dl = downloads.get(rt.file);
      const stem = rt.file.replace(/\.gguf$/i, "");
      let state: EngineModelState["state"] = present.has(rt.file) ? "downloaded" : "absent";
      if (dl?.state === "downloading") state = "downloading";
      if (dl?.state === "error") state = "error";
      models[manifest.id] = {
        file: rt.file,
        state,
        ...(dl?.state === "downloading"
          ? { receivedBytes: dl.receivedBytes, totalBytes: dl.totalBytes }
          : {}),
        ...(dl?.state === "error" ? { error: dl.error } : {}),
        ...(routerStates.has(stem) ? { routerState: routerStates.get(stem) } : {}),
      };
    }
    return {
      phase,
      ...(lastError ? { detail: lastError } : {}),
      modelsDir: modelsDir(),
      ...(external ? { external: true } : {}),
      models,
    };
  },

  logs(): string[] {
    return [...logLines];
  },

  /**
   * Download a registered llama-gguf model (and its speculative-decoding
   * draft, when defined). Progress is polled via status(). No-ops for files
   * already on disk.
   */
  async download(modelId: string): Promise<void> {
    const record = modelStore.get(modelId);
    const rt = record?.manifest.runtime;
    if (!record || rt?.kind !== "llama-gguf") throw new Error(`Not a local GGUF model: ${modelId}`);

    const files = [
      { file: rt.file, url: rt.url, sizeBytes: rt.sizeBytes },
      ...(rt.draft ? [rt.draft] : []),
    ];
    await Promise.all(files.map((f) => downloadFile(f.file, f.url, f.sizeBytes)));
    // New files on disk → regenerate presets and let a running router pick
    // them up on its next (re)start.
    if (phase === "running" && !external) {
      fs.writeFileSync(presetPath(), buildPresetIni(localFiles()), "utf-8");
    }
  },

  /** Delete a model's GGUF (and its draft if nothing else references it). */
  removeDownload(modelId: string): void {
    const record = modelStore.get(modelId);
    const rt = record?.manifest.runtime;
    if (!record || rt?.kind !== "llama-gguf") throw new Error(`Not a local GGUF model: ${modelId}`);
    const removable = [rt.file];
    if (rt.draft) {
      const draftFile = rt.draft.file;
      const sharedByOther = ggufManifests().some(
        (m) => m.id !== modelId && (m.runtime.draft?.file === draftFile || m.runtime.file === draftFile),
      );
      if (!sharedByOther) removable.push(draftFile);
    }
    for (const file of removable) {
      try {
        fs.unlinkSync(path.join(modelsDir(), file));
      } catch {
        // Already gone.
      }
      downloads.delete(file);
    }
  },

  /** Pre-warm / evict a model in the router (it also lazy-loads on demand). */
  async loadModel(modelId: string, action: "load" | "unload"): Promise<void> {
    const record = modelStore.get(modelId);
    const rt = record?.manifest.runtime;
    if (!record || rt?.kind !== "llama-gguf") throw new Error(`Not a local GGUF model: ${modelId}`);
    const res = await fetch(`${ROUTER_URL}/models/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: rt.file.replace(/\.gguf$/i, "") }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`Router ${action} failed: HTTP ${res.status} ${await res.text()}`);
  },

  /** Kill the supervised process on server shutdown. */
  dispose(): void {
    if (child) child.kill();
    child = null;
    phase = "stopped";
  },
};

async function downloadFile(file: string, url: string, expectedBytes: number): Promise<void> {
  const finalPath = path.join(modelsDir(), file);
  if (fs.existsSync(finalPath)) return;
  const existing = downloads.get(file);
  if (existing?.state === "downloading") return; // already in flight

  fs.mkdirSync(modelsDir(), { recursive: true });
  const partPath = `${finalPath}.part`;
  downloads.set(file, { state: "downloading", receivedBytes: 0, totalBytes: expectedBytes });

  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const total = Number(res.headers.get("content-length")) || expectedBytes;
    let received = 0;
    const counter = new Readable({ read() {} });
    const reader = res.body.getReader();
    const pump = (async () => {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        downloads.set(file, { state: "downloading", receivedBytes: received, totalBytes: total });
        counter.push(Buffer.from(value));
      }
      counter.push(null);
    })();
    await Promise.all([pump, pipeline(counter, fs.createWriteStream(partPath))]);
    fs.renameSync(partPath, finalPath);
    downloads.delete(file);
  } catch (err) {
    try {
      fs.unlinkSync(partPath);
    } catch {
      // Nothing partial to clean up.
    }
    const message = err instanceof Error ? err.message : "download failed";
    downloads.set(file, { state: "error", error: message });
    throw new Error(`Download of ${file} failed: ${message}`);
  }
}
