/**
 * Typed bridge to the Tauri backend. All router-API traffic is proxied
 * through Rust (`engine_api`) so the webview never deals with CORS.
 */
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface EngineStatus {
  running: boolean;
  pid: number | null;
  port: number;
  binary: string;
  modelsDir: string;
}

export interface LocalModel {
  file: string;
  sizeBytes: number;
}

export interface DownloadProgress {
  file: string;
  received: number;
  total: number | null;
  done: boolean;
  error: string | null;
}

/** Shape of one entry in the router's GET /models response. */
export interface RouterModel {
  id: string;
  path?: string;
  status?: {
    value: "loaded" | "loading" | "unloaded" | "sleeping" | "downloading";
    failed?: boolean;
    exit_code?: number;
  };
}

export const bridge = {
  engineStart: (presetIni: string, modelsMax: number) =>
    invoke<EngineStatus>("engine_start", { presetIni, modelsMax }),
  engineStop: () => invoke<EngineStatus>("engine_stop"),
  engineStatus: () => invoke<EngineStatus>("engine_status"),

  engineApi: <T = unknown>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown) =>
    invoke<T>("engine_api", { method, path, body: body ?? null }),

  listLocalModels: () => invoke<LocalModel[]>("list_local_models"),
  downloadModel: (url: string, file: string) => invoke<void>("download_model", { url, file }),
  deleteModel: (file: string) => invoke<void>("delete_model", { file }),

  configureArco: (model: string) => invoke<string>("configure_arco", { model }),

  onEngineLog: (fn: (line: string) => void): Promise<UnlistenFn> =>
    listen<{ line: string }>("engine-log", (e) => fn(e.payload.line)),
  onDownloadProgress: (fn: (p: DownloadProgress) => void): Promise<UnlistenFn> =>
    listen<DownloadProgress>("download-progress", (e) => fn(e.payload)),
};

// ── Router convenience calls ─────────────────────────────────────────────────

export async function fetchRouterModels(): Promise<RouterModel[]> {
  const res = await bridge.engineApi<{ data?: RouterModel[]; models?: RouterModel[] }>(
    "GET",
    "/models",
  );
  return res.data ?? res.models ?? [];
}

export function loadModel(id: string): Promise<unknown> {
  return bridge.engineApi("POST", "/models/load", { model: id });
}

export function unloadModel(id: string): Promise<unknown> {
  return bridge.engineApi("POST", "/models/unload", { model: id });
}

export interface BenchResult {
  text: string;
  ttftMs: number | null;
  promptTokens: number | null;
  generatedTokens: number | null;
  tokensPerSecond: number | null;
  totalMs: number;
}

/**
 * One non-streaming completion against the router. llama-server returns exact
 * `timings` (prompt ms, predicted per-second) alongside the choice, which
 * beats measuring stream deltas from the client.
 */
export async function benchChat(id: string, prompt: string): Promise<BenchResult> {
  const started = performance.now();
  const res = await bridge.engineApi<{
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    timings?: {
      prompt_ms?: number;
      predicted_ms?: number;
      predicted_per_second?: number;
      predicted_n?: number;
      prompt_n?: number;
    };
  }>("POST", "/v1/chat/completions", {
    model: id,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 512,
  });
  const totalMs = performance.now() - started;
  const t = res.timings;
  return {
    text: res.choices?.[0]?.message?.content ?? "(no content)",
    ttftMs: t?.prompt_ms ?? null,
    promptTokens: t?.prompt_n ?? res.usage?.prompt_tokens ?? null,
    generatedTokens: t?.predicted_n ?? res.usage?.completion_tokens ?? null,
    tokensPerSecond: t?.predicted_per_second ?? null,
    totalMs,
  };
}
