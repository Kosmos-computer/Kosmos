#!/usr/bin/env node
/**
 * Stage the Arco Node backend into dist/nodejs for the embedded Android sidecar.
 * Invoked by mobile:local:bundle after build:mobile.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import {
  APP_DIRS,
  COPY_PATHS,
  findSqliteNative,
} from "../apps/desktop/scripts/packaging-manifest.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stageRoot = path.join(repoRoot, "apps/mobile/pack-staging/nodejs");
const distNodeRoot = path.join(repoRoot, "dist/nodejs");

function copyTree(from, to) {
  fs.cpSync(from, to, {
    recursive: true,
    force: true,
    dereference: true,
    filter: (src) => !src.includes(`${path.sep}.git${path.sep}`),
  });
}

function run(cmd, args, cwd) {
  console.log(`\n→ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ARCO_SKIP_POSTINSTALL: "1" },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!fs.existsSync(path.join(repoRoot, "dist/index.html"))) {
  console.error("[mobile:local:stage] dist/ missing — run npm run build:mobile first");
  process.exit(1);
}

if (fs.existsSync(stageRoot)) {
  fs.rmSync(stageRoot, { recursive: true, force: true });
}
fs.mkdirSync(stageRoot, { recursive: true });

for (const relativePath of COPY_PATHS) {
  const source = path.join(repoRoot, relativePath);
  const target = path.join(stageRoot, relativePath);
  if (!fs.existsSync(source)) {
    console.error(`[mobile:local:stage] missing ${relativePath}`);
    process.exit(1);
  }
  console.log(`  • ${relativePath}`);
  copyTree(source, target);
}

fs.mkdirSync(path.join(stageRoot, "apps"), { recursive: true });
for (const appDir of APP_DIRS) {
  const source = path.join(repoRoot, "apps", appDir);
  const target = path.join(stageRoot, "apps", appDir);
  console.log(`  • apps/${appDir}`);
  copyTree(source, target);
}

const scriptsLib = path.join(repoRoot, "scripts/lib");
console.log("  • scripts/lib");
copyTree(scriptsLib, path.join(stageRoot, "scripts/lib"));

console.log("  • npm ci --omit=dev (nodejs sidecar runtime)");
run("npm", ["ci", "--omit=dev", "--ignore-scripts"], stageRoot);

console.log("  • esbuild server bundle → server-boot.mjs");
await esbuild.build({
  entryPoints: [path.join(repoRoot, "server/index.ts")],
  outfile: path.join(stageRoot, "server-boot.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  external: ["better-sqlite3"],
  packages: "external",
  logLevel: "info",
});

console.log("  • mobile node entry + package.json");
const mobileNodeTemplate = path.join(repoRoot, "apps/mobile/nodejs");
copyTree(mobileNodeTemplate, stageRoot);

const ndk = process.env.ANDROID_NDK_HOME ?? process.env.NDK_HOME;
if (ndk) {
  console.log("  • nodejs-mobile rebuild better-sqlite3 (android arm64)");
  run("npm", ["install", "nodejs-mobile@18.20.4", "--no-save"], stageRoot);
  run(
    "npx",
    [
      "nodejs-mobile-build",
      "rebuild",
      "--target-arch=arm64",
      "--target-platform=android",
      "better-sqlite3",
    ],
    stageRoot,
  );
} else {
  console.warn(
    "[mobile:local:stage] ANDROID_NDK_HOME not set — skipping better-sqlite3 rebuild.",
  );
  console.warn("  Install Android NDK and re-run for Razr/arm64 device builds.");
  run("npm", ["rebuild", "better-sqlite3"], stageRoot);
}

const localRequired = [
  { path: "dist/index.html", hint: "Run npm run build:mobile first." },
  { path: "server-boot.mjs", hint: "esbuild bundle failed." },
  { path: "main.mjs", hint: "Copy apps/mobile/nodejs template." },
  { path: "node_modules/hono/package.json", hint: "Production deps missing." },
  { path: "node_modules/better-sqlite3/package.json", hint: "better-sqlite3 missing." },
];

for (const { path: relativePath, hint } of localRequired) {
  if (!fs.existsSync(path.join(stageRoot, relativePath))) {
    console.error(`[mobile:local:stage] missing ${relativePath}`);
    console.error(`  ${hint}`);
    process.exit(1);
  }
}

if (!findSqliteNative(stageRoot, fs, path)) {
  console.error("[mobile:local:stage] better-sqlite3 native addon missing after rebuild");
  process.exit(1);
}

if (fs.existsSync(distNodeRoot)) {
  fs.rmSync(distNodeRoot, { recursive: true, force: true });
}
fs.mkdirSync(path.dirname(distNodeRoot), { recursive: true });
copyTree(stageRoot, distNodeRoot);

const nodeSize = fs.readdirSync(distNodeRoot).length;
console.log(`✓ Staged embedded backend at dist/nodejs (${nodeSize} top-level entries)`);
