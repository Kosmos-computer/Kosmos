#!/usr/bin/env node
/**
 * Verify a staged or packaged Arco desktop runtime before shipping.
 *
 * Usage:
 *   node apps/desktop/scripts/verify-packaging.mjs --staged
 *   node apps/desktop/scripts/verify-packaging.mjs --app "release/mac-arm64/Arco OS.app"
 *   node apps/desktop/scripts/verify-packaging.mjs --staged --smoke
 *
 * Checks:
 *   1. Build prerequisites (repo root, pre-stage)
 *   2. Runtime file tree (dist, server, deps, bundled apps)
 *   3. Platform native modules (@esbuild/*, better-sqlite3.node)
 *   4. Optional smoke test — boot backend with Electron's Node on a free port
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  esbuildPlatformPackage,
  findSqliteNative,
  RUNTIME_REQUIRED,
} from "./packaging-manifest.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const desktopRoot = path.join(repoRoot, "apps/desktop");

const BUILD_PREREQS = [
  { path: "dist/index.html", hint: "Run npm run build from the repo root." },
  { path: "apps/docs/dist/index.html", hint: "Run npm run build:apps." },
  { path: "server/generated/app-prompt.md", hint: "Run npm run generate." },
  { path: "server/generated/chat-prompt.md", hint: "Run npm run generate." },
];

function parseArgs(argv) {
  const opts = { staged: false, app: null, smoke: false, skipBuild: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--staged") opts.staged = true;
    else if (arg === "--smoke") opts.smoke = true;
    else if (arg === "--skip-build-check") opts.skipBuild = true;
    else if (arg === "--app") opts.app = argv[++i];
  }
  if (!opts.staged && !opts.app) {
    opts.staged = true;
    opts.smoke = true;
  }
  return opts;
}

function fail(title, items) {
  console.error(`\n✗ ${title}\n`);
  for (const item of items) {
    console.error(`  • ${item.path ?? item.id ?? item}`);
    if (item.hint) console.error(`    ${item.hint}`);
  }
  console.error("");
  process.exit(1);
}

function ok(label) {
  console.log(`  ✓ ${label}`);
}

function resolveRuntimeRoot(opts) {
  if (opts.app) {
    const appPath = path.isAbsolute(opts.app) ? opts.app : path.join(desktopRoot, opts.app);
    return {
      runtimeRoot: path.join(appPath, "Contents/Resources/arco"),
      electronBin: path.join(appPath, "Contents/MacOS/Arco OS"),
      label: appPath,
    };
  }
  return {
    runtimeRoot: path.join(desktopRoot, "pack-staging/arco"),
    electronBin: path.join(repoRoot, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"),
    label: "pack-staging/arco",
  };
}

function checkBuildPrerequisites() {
  console.log("Build prerequisites (repo root):");
  const missing = BUILD_PREREQS.filter(({ path: p }) => !fs.existsSync(path.join(repoRoot, p)));
  if (missing.length) fail("Build prerequisites missing", missing);
  for (const { path: p } of BUILD_PREREQS) ok(p);
}

function checkRuntimeTree(runtimeRoot) {
  console.log(`\nRuntime tree (${runtimeRoot}):`);
  if (!fs.existsSync(runtimeRoot)) {
    fail("Runtime root not found", [
      { path: runtimeRoot, hint: "Run node apps/desktop/scripts/stage-packaging.mjs or npm run pack -w @arco/desktop." },
    ]);
  }

  const missing = RUNTIME_REQUIRED.filter(({ path: p }) => !fs.existsSync(path.join(runtimeRoot, p)));
  if (missing.length) fail("Runtime files missing", missing);
  for (const { path: p } of RUNTIME_REQUIRED) ok(p);

  const esbuildPkg = esbuildPlatformPackage();
  if (esbuildPkg) {
    const esbuildPath = `node_modules/${esbuildPkg}/package.json`;
    if (!fs.existsSync(path.join(runtimeRoot, esbuildPath))) {
      fail("Platform esbuild binary missing", [
        {
          path: esbuildPath,
          hint: "Run stage-packaging (npm install esbuild must complete postinstall for this platform).",
        },
      ]);
    }
    ok(esbuildPath);
  } else {
    console.warn(`  ⚠ No esbuild platform mapping for ${process.platform}-${process.arch}`);
  }

  const sqliteNative = findSqliteNative(runtimeRoot, fs, path);
  if (!sqliteNative) {
    fail("better-sqlite3 native addon missing", [
      {
        path: "node_modules/better-sqlite3/build/**/better_sqlite3.node",
        hint: "Run electron-rebuild during stage-packaging for the Electron version in apps/desktop/package.json.",
      },
    ]);
  }
  ok(sqliteNative);
}

function findFreePort(start = 4700) {
  return new Promise((resolve, reject) => {
    const tryPort = (port, attemptsLeft) => {
      const server = net.createServer();
      server.once("error", () => {
        if (attemptsLeft <= 0) reject(new Error("Could not find a free port"));
        else tryPort(port + 1, attemptsLeft - 1);
      });
      server.once("listening", () => {
        server.close(() => resolve(port));
      });
      server.listen({ port, exclusive: true });
    };
    tryPort(start, 50);
  });
}

async function waitForArco(url, timeoutMs = 45_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.ok || res.status === 401 || res.status === 302) return res.status;
    } catch {
      // still booting
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function smokeTestRuntime(runtimeRoot, electronBin) {
  console.log("\nSmoke test (boot backend with Electron Node):");

  if (!fs.existsSync(electronBin)) {
    fail("Electron binary not found for smoke test", [
      { path: electronBin, hint: "Install electron in the repo or build the .app first." },
    ]);
  }

  const port = await findFreePort(4700);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "arco-verify-"));
  const tsxCli = path.join(runtimeRoot, "node_modules/tsx/dist/cli.mjs");
  const serverEntry = path.join(runtimeRoot, "server/index.ts");

  ok(`using port ${port}`);
  ok(`data dir ${dataDir}`);

  const child = spawn(electronBin, [tsxCli, serverEntry], {
    cwd: runtimeRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(port),
      ARCO_DATA_DIR: dataDir,
      ARCO_PACKAGED: "1",
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    const status = await waitForArco(`http://127.0.0.1:${port}/api/settings`);
    ok(`GET /api/settings → ${status}`);
    const ui = await fetch(`http://127.0.0.1:${port}/`);
    if (!ui.ok) throw new Error(`UI root returned ${ui.status}`);
    ok(`GET / → ${ui.status}`);
  } catch (err) {
    child.kill("SIGTERM");
    fail("Smoke test failed", [
      {
        id: "server_boot",
        hint: err instanceof Error ? err.message : String(err),
      },
      ...(stderr
        ? [{ id: "stderr", hint: stderr.trim().slice(-800) }]
        : []),
    ]);
  } finally {
    child.kill("SIGTERM");
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { runtimeRoot, electronBin, label } = resolveRuntimeRoot(opts);

  console.log(`Arco desktop packaging verification`);
  console.log(`Target: ${label}\n`);

  if (!opts.skipBuild && opts.staged) {
    checkBuildPrerequisites();
  }

  checkRuntimeTree(runtimeRoot);

  if (opts.smoke) {
    await smokeTestRuntime(runtimeRoot, electronBin);
  } else {
    console.log("\n  (skipped smoke test — pass --smoke to boot the backend)");
  }

  console.log("\n✓ Desktop packaging verification passed\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
