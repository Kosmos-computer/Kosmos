#!/usr/bin/env node
/**
 * Configure the packaged Arco desktop app for local llama-server models.
 *
 * Usage:
 *   node apps/desktop/scripts/setup-local-models.mjs
 *   node apps/desktop/scripts/setup-local-models.mjs --data-dir "~/Library/Application Support/@arco/desktop/data"
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const LOCAL_ENGINE_BASE_URL = "http://127.0.0.1:4650/v1";
const DEFAULT_MODEL_ID = "local.qwen3-1.7b";
const DEFAULT_MODEL_NAME = "Qwen3-1.7B-Q4_K_M";

function expandHome(input) {
  return input.startsWith("~") ? path.join(os.homedir(), input.slice(1)) : input;
}

function defaultDataDir() {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "@arco/desktop/data");
  }
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), "@arco/desktop/data");
  }
  return path.join(process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share"), "@arco/desktop/data");
}

function modelsDir() {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "arco-models/models");
  }
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), "arco-models/models");
  }
  return path.join(process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share"), "arco-models/models");
}

function findLlamaServer() {
  if (process.env.ARCO_LLAMA_SERVER && fs.existsSync(process.env.ARCO_LLAMA_SERVER)) {
    return process.env.ARCO_LLAMA_SERVER;
  }
  for (const candidate of ["/opt/homebrew/bin/llama-server", "/usr/local/bin/llama-server"]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function parseArgs(argv) {
  let dataDir = defaultDataDir();
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--data-dir") dataDir = expandHome(argv[++i]);
  }
  return { dataDir: path.resolve(dataDir) };
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
}

async function waitForHealth(timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch("http://127.0.0.1:4650/health");
      if (res.ok) return true;
    } catch {
      // still starting
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  const { dataDir } = parseArgs(process.argv.slice(2));
  const llamaServer = findLlamaServer();
  const ggufs = fs.existsSync(modelsDir())
    ? fs.readdirSync(modelsDir()).filter((f) => f.toLowerCase().endsWith(".gguf"))
    : [];

  console.log("Arco desktop — local models setup\n");
  console.log(`  data dir:    ${dataDir}`);
  console.log(`  models dir:  ${modelsDir()}`);
  console.log(`  llama-server: ${llamaServer ?? "NOT FOUND"}`);
  console.log(`  gguf files:  ${ggufs.length ? ggufs.join(", ") : "none"}\n`);

  if (!llamaServer) {
    console.error("✗ llama-server not found. Install with: brew install llama.cpp");
    process.exit(1);
  }

  if (ggufs.length === 0) {
    console.error("✗ No GGUF models found. Open Arco → Models app to download one, or copy .gguf files into:");
    console.error(`  ${modelsDir()}`);
    process.exit(1);
  }

  fs.mkdirSync(dataDir, { recursive: true });

  const settingsFile = path.join(dataDir, "settings.json");
  const assignmentsFile = path.join(dataDir, "model-assignments.json");
  const settings = {
    ...readJson(settingsFile, {}),
    provider: "local",
    baseUrl: LOCAL_ENGINE_BASE_URL,
    apiKey: "",
    model: ggufs.includes("Qwen3-1.7B-Q4_K_M.gguf") ? DEFAULT_MODEL_NAME : ggufs[0].replace(/\.gguf$/i, ""),
  };
  const assignments = {
    ...readJson(assignmentsFile, {}),
    "agent.chat": DEFAULT_MODEL_ID,
  };

  writeJson(settingsFile, settings);
  writeJson(assignmentsFile, assignments);
  console.log("✓ Updated settings.json for local provider");
  console.log(`✓ Assigned agent.chat → ${DEFAULT_MODEL_ID}`);

  if (await waitForHealth(1_000)) {
    console.log("✓ llama-server already running on :4650");
  } else {
    console.log("\n→ Starting llama-server on :4650…");
    const stageRoot = path.join(repoRoot, "apps/desktop/pack-staging/arco");
    const serverRoot = fs.existsSync(stageRoot) ? stageRoot : repoRoot;
    const electronBin = path.join(repoRoot, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
    if (!fs.existsSync(electronBin)) {
      console.log("  (llama-server will auto-start when you relaunch Arco OS)");
    } else {
      const { spawn } = await import("node:child_process");
      const child = spawn(
        electronBin,
        [path.join(serverRoot, "node_modules/tsx/dist/cli.mjs"), path.join(serverRoot, "server/index.ts")],
        {
          cwd: serverRoot,
          env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: "1",
            PORT: "4609",
            ARCO_DATA_DIR: dataDir,
            ARCO_PACKAGED: "1",
            NODE_ENV: "production",
            ARCO_LLAMA_SERVER: llamaServer,
            PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ""}`,
          },
          stdio: "ignore",
          detached: true,
        },
      );
      child.unref();
      if (await waitForHealth()) {
        console.log("✓ llama-server running on :4650");
        child.kill("SIGTERM");
      } else {
        console.log("  Could not confirm llama-server — relaunch Arco OS to start it");
        child.kill("SIGTERM");
      }
    }
  }

  console.log("\n✓ Local models configured. Relaunch Arco OS if it is already open.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
