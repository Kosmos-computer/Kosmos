#!/usr/bin/env node
/**
 * Stage the desktop runtime into pack-staging/arco before electron-builder.
 * electron-builder skips gitignored paths (dist/, node_modules/), so we assemble
 * a complete runtime tree here.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  APP_DIRS,
  COPY_PATHS,
  esbuildPlatformPackage,
  findDatachannelNative,
  findSqliteNative,
  RUNTIME_REQUIRED,
} from "./packaging-manifest.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const stageRoot = path.join(repoRoot, "apps/desktop/pack-staging/arco");
const ELECTRON_VERSION = "35.7.5";

function copyTree(from, to) {
  fs.cpSync(from, to, {
    recursive: true,
    force: true,
    dereference: true,
    filter: (src) => !src.includes(`${path.sep}.git${path.sep}`),
  });
}

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ARCO_SKIP_POSTINSTALL: "1" },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (fs.existsSync(stageRoot)) {
  fs.rmSync(stageRoot, { recursive: true, force: true });
}
fs.mkdirSync(stageRoot, { recursive: true });

for (const relativePath of COPY_PATHS) {
  const source = path.join(repoRoot, relativePath);
  const target = path.join(stageRoot, relativePath);
  if (!fs.existsSync(source)) {
    console.error(`Stage packaging failed: missing ${relativePath}`);
    process.exit(1);
  }
  console.log(`  • ${relativePath}`);
  copyTree(source, target);
}

fs.mkdirSync(path.join(stageRoot, "apps"), { recursive: true });
for (const appDir of APP_DIRS) {
  const source = path.join(repoRoot, "apps", appDir);
  const target = path.join(stageRoot, "apps", appDir);
  if (!fs.existsSync(source)) {
    console.error(`Stage packaging failed: missing apps/${appDir}`);
    process.exit(1);
  }
  console.log(`  • apps/${appDir}`);
  copyTree(source, target);
}

const scriptsLib = path.join(repoRoot, "scripts/lib");
if (!fs.existsSync(scriptsLib)) {
  console.error("Stage packaging failed: missing scripts/lib");
  process.exit(1);
}
console.log("  • scripts/lib");
copyTree(scriptsLib, path.join(stageRoot, "scripts/lib"));

console.log("  • npm ci --omit=dev (production runtime deps)");
run("npm", ["ci", "--omit=dev", "--ignore-scripts"], stageRoot);

console.log("  • npm install tsx esbuild (server bootstrap)");
run("npm", ["install", "tsx", "esbuild", "--no-save"], stageRoot);

// node-datachannel ships no prebuilds in the tarball — install scripts download
// the N-API binary. We used --ignore-scripts above, so fetch it explicitly.
const datachannelRoot = path.join(stageRoot, "node_modules/node-datachannel");
if (fs.existsSync(datachannelRoot)) {
  console.log("  • prebuild-install node-datachannel (WebTorrent / WebRTC)");
  run("npx", ["prebuild-install", "-r", "napi"], datachannelRoot);
}

console.log(`  • electron-rebuild better-sqlite3 for Electron ${ELECTRON_VERSION}`);
run("npx", ["electron-rebuild", "-f", "-w", "better-sqlite3", "--version", ELECTRON_VERSION], stageRoot);

for (const { path: relativePath, hint } of RUNTIME_REQUIRED) {
  if (!fs.existsSync(path.join(stageRoot, relativePath))) {
    console.error(`Stage packaging failed: missing ${relativePath}`);
    console.error(`  ${hint}`);
    process.exit(1);
  }
}

const esbuildPkg = esbuildPlatformPackage();
if (esbuildPkg) {
  const esbuildPath = path.join(stageRoot, "node_modules", esbuildPkg, "package.json");
  if (!fs.existsSync(esbuildPath)) {
    console.error(`Stage packaging failed: missing ${esbuildPkg}`);
    process.exit(1);
  }
}

if (!findSqliteNative(stageRoot, fs, path)) {
  console.error("Stage packaging failed: better-sqlite3 native addon not built");
  process.exit(1);
}

if (fs.existsSync(datachannelRoot) && !findDatachannelNative(stageRoot, fs, path)) {
  console.error("Stage packaging failed: node-datachannel native addon not installed");
  process.exit(1);
}

console.log("✓ Staged desktop runtime at apps/desktop/pack-staging/arco");
