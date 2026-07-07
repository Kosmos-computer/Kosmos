/**
 * First-install readiness checks shared by the CLI setup script and the
 * server's install-status route. Each check is cheap (filesystem + one import)
 * so we can run the full suite on every boot without slowing dev.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

export interface InstallCheck {
  id: string;
  label: string;
  ok: boolean;
  required: boolean;
  hint?: string;
}

export interface InstallStatus {
  ready: boolean;
  checks: InstallCheck[];
  optional: InstallCheck[];
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function readText(relativePath: string): string {
  try {
    return fs.readFileSync(path.join(ROOT, relativePath), "utf-8");
  } catch {
    return "";
  }
}

/** Node 22+ is required by package.json engines. */
export function checkNodeVersion(): InstallCheck {
  const major = Number(process.versions.node.split(".")[0]);
  const ok = major >= 22;
  return {
    id: "node",
    label: "Node.js 22+",
    ok,
    required: true,
    hint: ok ? undefined : `Found Node ${process.versions.node}. Install Node 22+ (nvm, fnm, or nodejs.org).`,
  };
}

/** Workspace dependencies from npm install. */
export function checkNodeModules(): InstallCheck {
  const ok = exists("node_modules/hono");
  return {
    id: "node_modules",
    label: "npm dependencies",
    ok,
    required: true,
    hint: ok ? undefined : "Run npm install from the repo root.",
  };
}

/** Local env file — copied from .env.example on first setup. */
export function checkEnvFile(): InstallCheck {
  const ok = exists(".env");
  return {
    id: "env",
    label: "Environment file (.env)",
    ok,
    required: false,
    hint: ok ? undefined : "Run npm run setup to copy .env.example → .env.",
  };
}

/** Generated LLM prompts consumed by the agent loop. */
export function checkGeneratedPrompts(): InstallCheck {
  const ok = exists("server/generated/app-prompt.md") && exists("server/generated/chat-prompt.md");
  return {
    id: "prompts",
    label: "Generated agent prompts",
    ok,
    required: true,
    hint: ok ? undefined : "Run npm run generate (or npm run setup).",
  };
}

/** Bundled docs app served at /apps/docs/dist/. */
export function checkDocsAppBuild(): InstallCheck {
  const ok = exists("apps/docs/dist/index.html");
  return {
    id: "docs_app",
    label: "Bundled docs app build",
    ok,
    required: true,
    hint: ok ? undefined : "Run npm run build:apps (or npm run setup).",
  };
}

/** Runtime data directory — created on server boot, but setup seeds it early. */
export function checkDataDir(): InstallCheck {
  const ok = exists("data");
  return {
    id: "data_dir",
    label: "Data directory (data/)",
    ok,
    required: true,
    hint: ok ? undefined : "Run npm run setup or start the server once.",
  };
}

/** Native SQLite driver — must compile during npm install. */
export async function checkSqlite(): Promise<InstallCheck> {
  try {
    await import("better-sqlite3");
    return { id: "sqlite", label: "SQLite native module", ok: true, required: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      id: "sqlite",
      label: "SQLite native module",
      ok: false,
      required: true,
      hint: `better-sqlite3 failed to load. On macOS install Xcode CLT; on Linux install build-essential + python3. ${message.slice(0, 120)}`,
    };
  }
}

function commandExists(cmd: string): boolean {
  try {
    execFileSync("which", [cmd], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function pythonVersionOk(): boolean {
  for (const cmd of ["python3.11", "python3.12", "python3.13", "python3"]) {
    if (!commandExists(cmd)) continue;
    try {
      const out = execFileSync(cmd, ["--version"], { encoding: "utf-8" });
      const match = out.match(/Python (\d+)\.(\d+)/);
      if (!match) continue;
      const major = Number(match[1]);
      const minor = Number(match[2]);
      if (major > 3 || (major === 3 && minor >= 11)) return true;
    } catch {
      // try next candidate
    }
  }
  return false;
}

/** Voice server Python venv — optional, ~1–2 GB of models on first run. */
export function checkVoiceVenv(): InstallCheck {
  const ok = exists("voice-server/.venv/bin/python");
  return {
    id: "voice_venv",
    label: "Voice server (Python venv)",
    ok,
    required: false,
    hint: ok ? undefined : "Optional: npm run setup -- --with-voice",
  };
}

/** llama-server for local models via Arco Models. */
export function checkLlamaServer(): InstallCheck {
  const ok = commandExists("llama-server");
  return {
    id: "llama_server",
    label: "llama-server (local models)",
    ok,
    required: false,
    hint: ok ? undefined : "Optional: brew install llama.cpp, then npm run models",
  };
}

/** Ollama for local inference without Arco Models. */
export function checkOllama(): InstallCheck {
  const ok = commandExists("ollama");
  return {
    id: "ollama",
    label: "Ollama CLI",
    ok,
    required: false,
    hint: ok ? undefined : "Optional: install from ollama.com for local models",
  };
}

export function checkPython(): InstallCheck {
  const ok = pythonVersionOk();
  return {
    id: "python",
    label: "Python 3.11+ (voice server)",
    ok,
    required: false,
    hint: ok ? undefined : "Optional: needed for npm run voice",
  };
}

export function checkRust(): InstallCheck {
  const ok = commandExists("cargo");
  return {
    id: "rust",
    label: "Rust toolchain (Arco Models)",
    ok,
    required: false,
    hint: ok ? undefined : "Optional: rustup.rs for npm run models",
  };
}

/** Marker written after a successful first-time npm run setup. */
export function markInstallComplete(): void {
  fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, "data/.install-complete"),
    JSON.stringify({ completedAt: new Date().toISOString(), node: process.versions.node }, null, 2),
    "utf-8",
  );
}

export function isInstallMarkedComplete(): boolean {
  return exists("data/.install-complete");
}

/** Copy .env.example when missing so LLM defaults are discoverable. */
export function ensureEnvFile(): boolean {
  const envPath = path.join(ROOT, ".env");
  if (fs.existsSync(envPath)) return false;
  const example = readText(".env.example");
  if (!example) return false;
  fs.writeFileSync(envPath, example, "utf-8");
  return true;
}

/** Seed the runtime data directory before the first server boot. */
export function ensureDataDir(): void {
  fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
}

export async function collectInstallStatus(): Promise<InstallStatus> {
  const checks: InstallCheck[] = [
    checkNodeVersion(),
    checkNodeModules(),
    checkEnvFile(),
    checkGeneratedPrompts(),
    checkDocsAppBuild(),
    checkDataDir(),
    await checkSqlite(),
  ];

  const optional: InstallCheck[] = [
    checkPython(),
    checkVoiceVenv(),
    checkLlamaServer(),
    checkOllama(),
    checkRust(),
  ];

  const ready = checks.filter((c) => c.required).every((c) => c.ok);
  return { ready, checks, optional };
}

export { ROOT as REPO_ROOT };
