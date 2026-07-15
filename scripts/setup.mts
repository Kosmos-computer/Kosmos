#!/usr/bin/env tsx
/**
 * First-install setup — prepares a fresh clone for `npm run dev` on any machine.
 *
 * Runs dependency checks, seeds .env + data/, regenerates prompts, builds bundled
 * apps, and optionally creates the voice-server Python venv.
 *
 * Usage:
 *   npm run setup
 *   npm run setup -- --with-voice
 *   npm run setup -- --check
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  REPO_ROOT,
  collectInstallStatus,
  ensureDataDir,
  ensureEnvFile,
  markInstallComplete,
} from "./lib/installChecks.js";

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const withVoice = args.has("--with-voice");
const skipNpm = args.has("--skip-npm");

function log(message: string): void {
  console.log(message);
}

function runNpm(script: string, label: string): boolean {
  log(`\n→ ${label}…`);
  const result = spawnSync("npm", ["run", script], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    log(`✗ ${label} failed (exit ${result.status ?? "unknown"})`);
    return false;
  }
  return true;
}

function setupVoiceVenv(): boolean {
  const venvPython = path.join(REPO_ROOT, "voice-server/.venv/bin/python");
  if (fs.existsSync(venvPython)) {
    log("✓ Voice server venv already exists");
    return true;
  }

  log("\n→ Setting up voice-server Python venv (this may take a few minutes)…");
  const venvDir = path.join(REPO_ROOT, "voice-server/.venv");
  const create = spawnSync("python3", ["-m", "venv", venvDir], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  if (create.status !== 0) {
    log("✗ Could not create Python venv. Install Python 3.11+ and retry with --with-voice.");
    return false;
  }

  const pip = spawnSync(
    venvPython,
    ["-m", "pip", "install", "-r", "requirements.txt"],
    { cwd: path.join(REPO_ROOT, "voice-server"), stdio: "inherit" },
  );
  if (pip.status !== 0) {
    log("✗ pip install failed for voice-server.");
    return false;
  }

  log("✓ Voice server venv ready (first voice run still downloads ~1–2 GB of models)");
  return true;
}

function printStatus(): Promise<boolean> {
  return collectInstallStatus().then((status) => {
    log("\nInstall status");
    log("──────────────");
    for (const check of status.checks) {
      const mark = check.ok ? "✓" : status.ready || !check.required ? "·" : "✗";
      log(`${mark} ${check.label}${check.hint && !check.ok ? `\n    ${check.hint}` : ""}`);
    }
    log("\nOptional");
    for (const check of status.optional) {
      log(`${check.ok ? "✓" : "·"} ${check.label}${check.hint && !check.ok ? `\n    ${check.hint}` : ""}`);
    }
    return status.ready;
  });
}

async function main(): Promise<number> {
  log("Arco OS — first-install setup\n");

  const initial = await collectInstallStatus();
  if (checkOnly) {
    await printStatus();
    return initial.ready ? 0 : 1;
  }

  if (!skipNpm && !initial.checks.find((c) => c.id === "node_modules")?.ok) {
    log("→ Installing npm dependencies…");
    const install = spawnSync("npm", ["install"], { cwd: REPO_ROOT, stdio: "inherit" });
    if (install.status !== 0) return 1;
  }

  if (ensureEnvFile()) log("✓ Created .env from .env.example");
  ensureDataDir();

  if (!runNpm("generate", "Generating agent prompts")) return 1;
  if (!runNpm("build:apps", "Building bundled apps")) return 1;

  if (withVoice && !setupVoiceVenv()) {
    log("\nVoice setup failed — core Arco is still ready. Retry with: npm run setup -- --with-voice");
  }

  const ready = await printStatus();
  if (ready) {
    markInstallComplete();
    log("\n✓ Setup complete. Start Arco with:\n\n    npm run dev\n\nThen open http://localhost:4610");
    log("\nOptional extras:");
    log("  npm run dev:all     server + web + voice");
    log("  npm run models      local model manager (needs llama-server + Rust)");
    log("  npm run desktop:dev full stack in Electron");
    return 0;
  }

  log("\n✗ Setup incomplete — fix the items marked ✗ above and rerun npm run setup");
  return 1;
}

main().then((code) => process.exit(code));
