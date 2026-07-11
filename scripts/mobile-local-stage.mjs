#!/usr/bin/env node
/**
 * Stage the Arco Node backend into dist/nodejs for the embedded Android sidecar.
 * Keeps the APK sidecar small: bundled server + better-sqlite3 only (no full node_modules).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { APP_DIRS, findSqliteNative } from "../apps/desktop/scripts/packaging-manifest.mjs";
import { defaultNdkHome } from "./mobile-android-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stageRoot = path.join(repoRoot, "apps/mobile/pack-staging/nodejs");
const distNodeRoot = path.join(repoRoot, "dist/nodejs");
const sqliteVersion =
  JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")).dependencies[
    "better-sqlite3"
  ] ?? "^12.0.0";

const SQLITE_ANDROID_PREBUILD_URL =
  "https://github.com/digidem/better-sqlite3-nodejs-mobile/releases/download/12.10.0/better-sqlite3-12.10.0-node-108-android-arm64.tar.gz";

function copyTree(from, to, filter) {
  fs.cpSync(from, to, {
    recursive: true,
    force: true,
    dereference: true,
    filter: (src) => {
      if (src.includes(`${path.sep}.git${path.sep}`)) return false;
      if (filter && !filter(src)) return false;
      return true;
    },
  });
}

/** Skip bulky artifacts that the embedded server does not need at runtime. */
function skipBulkyDistPaths(src) {
  const rel = path.relative(path.join(repoRoot, "dist"), src);
  if (rel.startsWith(`downloads${path.sep}`)) return false;
  if (rel.startsWith(`nodejs${path.sep}`)) return false;
  return true;
}

function run(cmd, args, cwd, extraEnv = {}) {
  console.log(`\n→ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ARCO_SKIP_POSTINSTALL: "1", ...extraEnv },
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

for (const relativePath of ["dist", "skills"]) {
  const source = path.join(repoRoot, relativePath);
  if (!fs.existsSync(source)) {
    console.error(`[mobile:local:stage] missing ${relativePath}`);
    process.exit(1);
  }
  console.log(`  • ${relativePath}`);
  const distFilter = relativePath === "dist" ? skipBulkyDistPaths : undefined;
  copyTree(source, path.join(stageRoot, relativePath), distFilter);
}

const generatedDir = path.join(repoRoot, "server/generated");
if (!fs.existsSync(generatedDir)) {
  console.error("[mobile:local:stage] missing server/generated — run npm run generate");
  process.exit(1);
}
console.log("  • server/generated");
copyTree(generatedDir, path.join(stageRoot, "server/generated"));
console.log("  • generated (esbuild bundle __dirname compat)");
copyTree(generatedDir, path.join(stageRoot, "generated"));

const seedsDir = path.join(repoRoot, "server/seeds");
if (fs.existsSync(seedsDir)) {
  console.log("  • server/seeds");
  copyTree(seedsDir, path.join(stageRoot, "server/seeds"));
}

console.log("  • packages/app-sdk");
fs.mkdirSync(path.join(stageRoot, "packages/app-sdk"), { recursive: true });
fs.copyFileSync(
  path.join(repoRoot, "packages/app-sdk/sdk.js"),
  path.join(stageRoot, "packages/app-sdk/sdk.js"),
);

fs.mkdirSync(path.join(stageRoot, "apps"), { recursive: true });
for (const appDir of APP_DIRS) {
  const source = path.join(repoRoot, "apps", appDir);
  if (!fs.existsSync(source)) continue;
  console.log(`  • apps/${appDir}`);
  copyTree(source, path.join(stageRoot, "apps", appDir));
}

console.log("  • esbuild server bundle → server-boot.mjs");
await esbuild.build({
  entryPoints: [path.join(repoRoot, "server/index.ts")],
  outfile: path.join(stageRoot, "server-boot.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  external: ["better-sqlite3"],
  packages: "bundle",
  alias: {
    "@cursor/sdk": path.join(repoRoot, "scripts/mobile-stubs/cursor-sdk.mjs"),
    "cross-spawn": path.join(repoRoot, "scripts/mobile-stubs/cross-spawn.mjs"),
    "node:child_process": path.join(repoRoot, "scripts/mobile-stubs/child-process.mjs"),
    child_process: path.join(repoRoot, "scripts/mobile-stubs/child-process.mjs"),
  },
  logLevel: "info",
});

console.log("  • mobile node entry + package.json");
copyTree(path.join(repoRoot, "apps/mobile/nodejs"), stageRoot);

const bridgeSrc = path.join(
  repoRoot,
  "node_modules/capacitor-nodejs/android/src/main/assets/builtin_modules/bridge",
);
const bridgeDest = path.join(stageRoot, "node_modules/bridge");
console.log("  • node_modules/bridge (Capacitor IPC)");
fs.mkdirSync(path.dirname(bridgeDest), { recursive: true });
copyTree(bridgeSrc, bridgeDest);

console.log(`  • npm install better-sqlite3@${sqliteVersion.replace(/^[\^~]/, "")}`);
fs.writeFileSync(
  path.join(stageRoot, "package.json"),
  `${JSON.stringify(
    {
      name: "arco-mobile-local-backend",
      private: true,
      version: "0.1.2",
      type: "module",
      main: "main.mjs",
      dependencies: {
        "better-sqlite3": sqliteVersion,
      },
    },
    null,
    2,
  )}\n`,
);
run("npm", ["install", "--omit=dev", "--ignore-scripts"], stageRoot);

const sqliteNativeDir = path.join(
  stageRoot,
  "node_modules/better-sqlite3/build/Release",
);
const sqliteNativePath = path.join(sqliteNativeDir, "better_sqlite3.node");
const ndk = process.env.ANDROID_NDK_HOME ?? process.env.NDK_HOME ?? defaultNdkHome();

if (ndk) {
  console.log("  • better-sqlite3 prebuild (android arm64, Node 18 ABI 108)");
  fs.mkdirSync(sqliteNativeDir, { recursive: true });
  const archive = path.join(stageRoot, ".better-sqlite3-android-arm64.tar.gz");
  const curl = spawnSync("curl", ["-fsL", SQLITE_ANDROID_PREBUILD_URL, "-o", archive], {
    stdio: "inherit",
  });
  if (curl.status !== 0) {
    console.error("[mobile:local:stage] failed to download better-sqlite3 android prebuild");
    process.exit(curl.status ?? 1);
  }
  const tar = spawnSync("tar", ["-xzf", archive, "-C", sqliteNativeDir, "--strip-components=1"], {
    stdio: "inherit",
  });
  fs.rmSync(archive, { force: true });
  if (tar.status !== 0 || !fs.existsSync(sqliteNativePath)) {
    console.error("[mobile:local:stage] failed to extract better-sqlite3 android prebuild");
    process.exit(tar.status ?? 1);
  }
  const magic = fs.readFileSync(sqliteNativePath).subarray(0, 4).toString("hex");
  if (magic !== "7f454c46") {
    console.error(
      `[mobile:local:stage] better-sqlite3 prebuild is not ELF (magic ${magic})`,
    );
    process.exit(1);
  }
  console.log("  • better-sqlite3 native addon: Android ELF arm64");
} else {
  console.warn(
    "[mobile:local:stage] ANDROID_NDK_HOME not set — host rebuild only (won't run on Razr).",
  );
  run("npm", ["rebuild", "better-sqlite3"], stageRoot);
}

const localRequired = [
  { path: "dist/index.html", hint: "Run npm run build:mobile first." },
  { path: "server-boot.mjs", hint: "esbuild bundle failed." },
  { path: "main.mjs", hint: "Copy apps/mobile/nodejs template." },
  { path: "server/generated/app-prompt.md", hint: "Run npm run generate." },
  { path: "generated/openui-schema.json", hint: "Run npm run generate." },
  { path: "packages/app-sdk/sdk.js", hint: "packages/app-sdk missing." },
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

const fileCount = (dir) => {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) count += fileCount(full);
    else count += 1;
  }
  return count;
};

const stagedFiles = fileCount(stageRoot);
console.log(`  • sidecar file count: ${stagedFiles}`);

if (fs.existsSync(distNodeRoot)) {
  fs.rmSync(distNodeRoot, { recursive: true, force: true });
}
fs.mkdirSync(path.dirname(distNodeRoot), { recursive: true });
copyTree(stageRoot, distNodeRoot);

console.log(`✓ Staged embedded backend at dist/nodejs (${stagedFiles} files)`);
