#!/usr/bin/env node
/**
 * Build + install bundled APK on Chromebook (server URL chosen in app at first run).
 *
 * For dev against Mac Vite instead: CAP_SERVER_URL=https://MAC:4610 npm run mobile:chromebook:install
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MOBILE_APK } from "./mobile-apk-paths.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(root, "apps/mobile/android");
const apkPath = MOBILE_APK.connect;
const gradlew = path.join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");
const javaHome =
  process.env.JAVA_HOME ??
  "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home";

function lanIp() {
  for (const nets of Object.values(os.networkInterfaces())) {
    if (!nets) continue;
    for (const net of nets) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

function run(cmd, opts = {}) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

function adb(args) {
  return spawnSync("adb", args, { encoding: "utf8" });
}

const chromebookIp = process.env.CHROMEBOOK_IP?.trim();
if (!chromebookIp) {
  console.error(`
[mobile:chromebook:install] Set CHROMEBOOK_IP to your Chromebook's Wi‑Fi address.

  Settings → Network → Wi‑Fi → IP address
  Example: CHROMEBOOK_IP=10.0.0.47 npm run mobile:chromebook:install
`);
  process.exit(1);
}

const macIp = lanIp();
const devServerUrl = process.env.CAP_SERVER_URL?.trim();
const bundled = process.env.MOBILE_BUNDLED === "1" || process.env.MOBILE_DEV !== "1";

if (bundled) {
  run("npm run mobile:bundle");
} else {
  const serverUrl = devServerUrl ?? `https://${macIp}:4610`;
  console.log(`[mobile:chromebook:install] Dev mode — app loads: ${serverUrl}`);
  run("npm run build:mobile");
  run(`CAP_SERVER_URL=${serverUrl} npm run mobile:sync`);
  run(`"${gradlew}" assembleDebug`, {
    cwd: androidDir,
    env: { ...process.env, JAVA_HOME: javaHome },
  });
}

const connect = adb(["connect", `${chromebookIp}:5555`]);
process.stdout.write(connect.stdout ?? "");
process.stderr.write(connect.stderr ?? "");

for (let i = 0; i < 12; i++) {
  const devices = adb(["devices"]);
  const line = devices.stdout?.split("\n").find((l) => l.includes(chromebookIp));
  if (line?.includes("device") && !line.includes("unauthorized")) break;
  if (i === 0) console.log("\nWaiting for authorization on Chromebook…");
  if (line?.includes("unauthorized")) {
    console.log("  → Tap Allow on the Chromebook screen");
  }
  execSync("sleep 5");
}

const final = adb(["devices"]);
if (!final.stdout?.includes(`${chromebookIp}:5555`) || final.stdout.includes("unauthorized")) {
  console.error("\n[mobile:chromebook:install] Chromebook not authorized. Tap Allow on device and retry.");
  process.exit(1);
}

if (!bundled) {
  run(`"${gradlew}" assembleDebug`, {
    cwd: androidDir,
    env: { ...process.env, JAVA_HOME: javaHome },
  });
}

if (!fs.existsSync(apkPath)) {
  console.error("[mobile:chromebook:install] APK missing after build");
  process.exit(1);
}

console.log(`\n→ adb -s ${chromebookIp}:5555 install -r ${apkPath}`);
const install = adb(["-s", `${chromebookIp}:5555`, "install", "-r", apkPath]);
process.stdout.write(install.stdout ?? "");
process.stderr.write(install.stderr ?? "");
if (install.status !== 0) process.exit(install.status ?? 1);

console.log(bundled
  ? `
✓ Bundled Arco OS installed on Chromebook (${chromebookIp}).
  Open the app → enter your server URL (no default host).
  Settings → Server to switch profiles later.
`
  : `
✓ Arco OS installed on Chromebook (${chromebookIp}).
  Keep running: npm run dev:chromebook
  Open Arco OS on the Chromebook.
`);
