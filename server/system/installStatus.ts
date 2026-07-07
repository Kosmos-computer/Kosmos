/**
 * Server-side install readiness — mirrors scripts/lib/installChecks.ts so the
 * boot splash can surface missing build steps before the user hits a blank app.
 */
import fs from "node:fs";
import path from "node:path";
import type { InstallCheck, InstallStatus } from "../../scripts/lib/installChecks.js";

const ROOT = process.cwd();

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function check(id: string, label: string, ok: boolean, required: boolean, hint?: string): InstallCheck {
  return { id, label, ok, required, hint };
}

async function checkSqlite(): Promise<InstallCheck> {
  try {
    await import("better-sqlite3");
    return check("sqlite", "SQLite native module", true, true);
  } catch {
    return check(
      "sqlite",
      "SQLite native module",
      false,
      true,
      "Run npm install from the repo root. On macOS install Xcode Command Line Tools.",
    );
  }
}

export async function getInstallStatus(): Promise<InstallStatus> {
  const checks: InstallCheck[] = [
    check(
      "prompts",
      "Generated agent prompts",
      exists("server/generated/app-prompt.md") && exists("server/generated/chat-prompt.md"),
      true,
      "Run npm run setup from the repo root.",
    ),
    check(
      "docs_app",
      "Bundled docs app build",
      exists("apps/docs/dist/index.html"),
      true,
      "Run npm run setup from the repo root.",
    ),
    check("data_dir", "Data directory", exists("data"), true, "Created automatically on first server start."),
    await checkSqlite(),
  ];

  const optional: InstallCheck[] = [
    check(
      "voice_venv",
      "Voice server (Python venv)",
      exists("voice-server/.venv/bin/python"),
      false,
      "Optional: npm run setup -- --with-voice",
    ),
  ];

  const ready = checks.filter((c) => c.required).every((c) => c.ok);
  return { ready, checks, optional };
}
