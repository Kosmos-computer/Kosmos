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
  provider: process.env.LLM_API_KEY ? "custom" : "mock",
  baseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
  apiKey: process.env.LLM_API_KEY ?? "",
  model: process.env.LLM_MODEL ?? "gpt-5.5",
  wallpaper: "aurora",
};

export function loadSettings(): Settings {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
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
  };
}

