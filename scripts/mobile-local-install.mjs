#!/usr/bin/env node
/**
 * Build + USB install the embedded-backend Arco APK (full stack on device).
 *
 *   npm run mobile:local:install
 *
 * Requires USB debugging on the phone (Motorola Razr, etc.).
 * Set ANDROID_NDK_HOME before bundle for arm64 better-sqlite3 rebuild.
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MOBILE_APK } from "./mobile-apk-paths.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(root, "apps/mobile/android");
const apkPath = MOBILE_APK.local;

function run(cmd, opts = {}) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

function adb(args) {
  return spawnSync("adb", args, { encoding: "utf8" });
}

const which = spawnSync("which", ["adb"], { encoding: "utf8" });
if (which.status !== 0) {
  console.error("[mobile:local:install] adb not found — brew install android-platform-tools");
  process.exit(1);
}

const devices = adb(["devices"]);
const authorized = devices.stdout
  .split("\n")
  .slice(1)
  .map((l) => l.trim())
  .filter((l) => l.endsWith("device"));
if (authorized.length === 0) {
  console.error("[mobile:local:install] No authorized Android device — enable USB debugging");
  process.exit(1);
}

if (!process.env.SKIP_BUILD) {
  run("npm run mobile:local:bundle");
}

if (!fs.existsSync(apkPath)) {
  console.error(`[mobile:local:install] APK missing at ${apkPath}`);
  process.exit(1);
}

console.log(`\n[mobile:local:install] Installing ${apkPath}`);
const install = adb(["install", "-r", apkPath]);
process.stdout.write(install.stdout ?? "");
process.stderr.write(install.stderr ?? "");
if (install.status !== 0) {
  process.exit(install.status ?? 1);
}

console.log(`
✓ Arco Local installed (${authorized[0].split("\t")[0]}).

Open **Arco Local** on the phone (not Arco Connect).
First boot starts the embedded server — wait for the setup wizard.
Data stays on device under app storage (survives updates; cleared on uninstall).

Thin client (remote server): npm run mobile:install → **Arco Connect**
`);
