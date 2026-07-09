#!/usr/bin/env node
/**
 * Build embedded-backend APK — full Arco on device (nodejs-mobile sidecar).
 * Thin client builds use npm run mobile:bundle instead.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MOBILE_APK, MOBILE_DOWNLOAD } from "./mobile-apk-paths.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(root, "apps/mobile/android");
const apkPath = MOBILE_APK.local;
const gradlew = path.join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");
const javaHome =
  process.env.JAVA_HOME ??
  "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home";
const downloadsDir = path.join(root, "public/downloads");

function run(cmd, opts = {}) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

console.log("[mobile:local:bundle] Building embedded-backend mobile APK…");
run("npm run build:mobile:local");
run("node scripts/mobile-local-stage.mjs");
run("npm run mobile:icons");
run("MOBILE_LOCAL=1 npm run mobile:sync");

const nodejsDir = path.join(root, "dist/nodejs/main.mjs");
if (!fs.existsSync(nodejsDir)) {
  console.error("[mobile:local:bundle] dist/nodejs/main.mjs missing after staging");
  process.exit(1);
}

run(`"${gradlew}" assembleLocalDebug`, {
  cwd: androidDir,
  env: { ...process.env, JAVA_HOME: javaHome },
});

if (!fs.existsSync(apkPath)) {
  console.error("[mobile:local:bundle] APK missing after build");
  process.exit(1);
}

fs.mkdirSync(downloadsDir, { recursive: true });
const dest = MOBILE_DOWNLOAD.local;
fs.copyFileSync(apkPath, dest);
console.log(`
✓ Local Arco APK ready: ${dest}

Install on Razr: npm run mobile:local:install
Launcher name on device: Arco Local
First launch boots embedded Node + SQLite on device (~1 min).
`);
