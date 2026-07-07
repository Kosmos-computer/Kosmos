/**
 * Data-directory layout and settings persistence.
 *
 * Everything Arco stores lives under one data dir (default `./data`):
 *   apps/          — generated apps, one JSON per app
 *   sessions/      — chat + automation sessions, one JSON per session
 *   db/            — SQLite databases, one file per namespace
 *   workspace/     — the agent's working directory (scripts, files, exec cwd)
 *   settings.json  — LLM provider config + shell prefs
 *   automations.json
 */
import fs from "node:fs";
import path from "node:path";
import type { Settings } from "../shared/types.js";

const ROOT = process.env.ARCO_DATA_DIR
  ? path.resolve(process.env.ARCO_DATA_DIR)
  : path.resolve(process.cwd(), "data");

export const dataDirs = {
  root: ROOT,
  apps: path.join(ROOT, "apps"),
  sessions: path.join(ROOT, "sessions"),
  db: path.join(ROOT, "db"),
  workspace: path.join(ROOT, "workspace"),
};

export function ensureDataDirs(): void {
  for (const dir of Object.values(dataDirs)) fs.mkdirSync(dir, { recursive: true });
  const scriptsDir = path.join(dataDirs.workspace, "scripts");
  fs.mkdirSync(scriptsDir, { recursive: true });
}

// ── Settings ─────────────────────────────────────────────────────────────────

const SETTINGS_FILE = path.join(ROOT, "settings.json");

const DEFAULT_SETTINGS: Settings = {
  provider: process.env.LLM_PROVIDER?.trim()
    ? (process.env.LLM_PROVIDER.trim() as Settings["provider"])
    : process.env.LLM_API_KEY
      ? "custom"
      : process.env.LLM_BASE_URL?.trim()
        ? "ollama"
        : "mock",
  baseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
  apiKey: process.env.LLM_API_KEY ?? "",
  model: process.env.LLM_MODEL ?? "gpt-5.5",
  wallpaper: "aurora",
  agent: "builtin",
  acpCommand: "",
  cursorApiKey: process.env.CURSOR_API_KEY ?? "",
  cursorModel: process.env.CURSOR_MODEL ?? "composer-2.5",
  cursorRuntime: "local",
  cursorRepoUrl: "",
};

function applyLlmEnvOverrides(settings: Settings): Settings {
  // In Docker/Coolify, wire the LLM via env — persisted settings.json may still
  // point at desktop-only endpoints (e.g. model-manager on 127.0.0.1:4650).
  if (process.env.LLM_BASE_URL?.trim()) {
    settings.baseUrl = process.env.LLM_BASE_URL.trim();
    if (process.env.LLM_PROVIDER?.trim()) {
      settings.provider = process.env.LLM_PROVIDER.trim() as Settings["provider"];
    } else if (!process.env.LLM_API_KEY?.trim() && settings.provider === "local") {
      settings.provider = "ollama";
    }
  }
  if (process.env.LLM_MODEL?.trim()) settings.model = process.env.LLM_MODEL.trim();
  if (process.env.LLM_API_KEY !== undefined) settings.apiKey = process.env.LLM_API_KEY;
  if (process.env.CURSOR_API_KEY !== undefined) settings.cursorApiKey = process.env.CURSOR_API_KEY;
  if (process.env.CURSOR_MODEL?.trim()) settings.cursorModel = process.env.CURSOR_MODEL.trim();
  return settings;
}

/** Resolved Cursor API key — settings first, then CURSOR_API_KEY env. */
export function resolveCursorApiKey(settings: Settings): string {
  return settings.cursorApiKey.trim() || process.env.CURSOR_API_KEY?.trim() || "";
}

export function loadSettings(): Settings {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return applyLlmEnvOverrides({ ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) });
  } catch {
    return applyLlmEnvOverrides({ ...DEFAULT_SETTINGS });
  }
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const merged = { ...loadSettings(), ...patch };
  fs.mkdirSync(ROOT, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

/** API keys never leave the server unmasked. */
export function maskSettings(s: Settings): Settings {
  return {
    ...s,
    apiKey: s.apiKey ? `••••${s.apiKey.slice(-4)}` : "",
    cursorApiKey: s.cursorApiKey ? `••••${s.cursorApiKey.slice(-4)}` : "",
    ...(s.apiKeys
      ? {
          apiKeys: Object.fromEntries(
            Object.entries(s.apiKeys).map(([ref, key]) => [ref, key ? `••••${key.slice(-4)}` : ""]),
          ),
        }
      : {}),
  };
}

