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
import type { AgentBackend, AgentBackendKind, Settings } from "../shared/types.js";

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
  const projectsDir = path.join(dataDirs.workspace, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  ensureCodexConfig();
}

/** Codex ACP reads sandbox settings from $CODEX_HOME/config.toml. */
function ensureCodexConfig(): void {
  const codexHome = path.join(ROOT, ".codex");
  fs.mkdirSync(codexHome, { recursive: true });
  const configPath = path.join(codexHome, "config.toml");
  if (fs.existsSync(configPath)) return;
  fs.writeFileSync(
    configPath,
    [
      "# Kosmos defaults — Codex file tools in Docker/containers",
      'sandbox_mode = "workspace-write"',
      'approval_policy = "on-request"',
      "",
    ].join("\n"),
    "utf-8",
  );
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
  agentBackends: [],
  activeAgentBackendId: null,
  locale: "en",
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
  // Model id is a default only — picker switches (openrouter/*) must stick.
  if (process.env.LLM_MODEL?.trim() && !settings.model?.trim()) {
    settings.model = process.env.LLM_MODEL.trim();
  }
  if (process.env.LLM_API_KEY !== undefined) settings.apiKey = process.env.LLM_API_KEY;
  if (process.env.CURSOR_API_KEY !== undefined) settings.cursorApiKey = process.env.CURSOR_API_KEY;
  if (process.env.CURSOR_MODEL?.trim()) settings.cursorModel = process.env.CURSOR_MODEL.trim();
  return settings;
}

/** Resolved Cursor API key — settings first, then CURSOR_API_KEY env. */
export function resolveCursorApiKey(settings: Settings): string {
  return settings.cursorApiKey.trim() || process.env.CURSOR_API_KEY?.trim() || "";
}

/** Per-kind env fallback for a registered-less agent backend. */
const AGENT_BACKEND_ENV: Record<AgentBackendKind, { host: string; key: string }> = {
  openhands: { host: "OPENHANDS_HOST", key: "OPENHANDS_API_KEY" },
  kosmos: { host: "KOSMOS_REMOTE_HOST", key: "KOSMOS_REMOTE_TOKEN" },
};

/**
 * Active backend for a given kind — the registered agentBackends entry
 * matching activeAgentBackendId (narrowed to that kind), the sole
 * registered entry of that kind, or (if none registered) a synthetic
 * default built from that kind's env vars — mirroring how agent-canvas
 * seeds a default local backend when none is registered.
 */
export function resolveActiveAgentBackend(settings: Settings, kind: AgentBackendKind): AgentBackend | null {
  const candidates = (settings.agentBackends ?? []).filter((b) => b.kind === kind);
  const active = candidates.find((b) => b.id === settings.activeAgentBackendId);
  if (active) return active;
  if (candidates.length === 1) return candidates[0];
  const env = AGENT_BACKEND_ENV[kind];
  const host = process.env[env.host]?.trim();
  if (host) {
    return {
      id: "env-default",
      name: "Default (env)",
      kind,
      host,
      apiKey: process.env[env.key]?.trim() ?? "",
      ...(kind === "openhands" ? { variant: "local" as const } : {}),
    };
  }
  return null;
}

/** One-time upgrade of the pre-generalization openhandsBackends/openhandsActiveBackendId shape. */
function migrateLegacyAgentBackends(raw: Record<string, unknown>): Partial<Settings> {
  if (raw.agentBackends !== undefined || raw.openhandsBackends === undefined) return {};
  const legacyBackends = raw.openhandsBackends as Array<Record<string, unknown>>;
  return {
    agentBackends: legacyBackends.map((b) => ({ ...b, kind: "openhands" }) as AgentBackend),
    activeAgentBackendId: (raw.openhandsActiveBackendId as string | null | undefined) ?? null,
  };
}

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")) as Record<string, unknown>;
    return applyLlmEnvOverrides({
      ...DEFAULT_SETTINGS,
      ...(raw as Partial<Settings>),
      ...migrateLegacyAgentBackends(raw),
    });
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
    agentBackends: (s.agentBackends ?? []).map((b) => ({
      ...b,
      apiKey: b.apiKey ? `••••${b.apiKey.slice(-4)}` : "",
    })),
    ...(s.apiKeys
      ? {
          apiKeys: Object.fromEntries(
            Object.entries(s.apiKeys).map(([ref, key]) => [ref, key ? `••••${key.slice(-4)}` : ""]),
          ),
        }
      : {}),
  };
}

