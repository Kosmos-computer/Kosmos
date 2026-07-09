#!/usr/bin/env node
/**
 * Build + sideload Arco mobile APK onto a USB-connected Android device.
 *
 * Dev mode (default): adb reverse ports so the phone hits localhost on your machine.
 *   npm run dev          # terminal 1
 *   npm run mobile:install
 *
 * Env:
 *   CAP_SERVER_URL  — override WebView entry (default http://127.0.0.1:4610 via adb reverse)
 *   SKIP_BUILD=1    — skip vite build (reuse dist/)
 *   SKIP_GRADLE=1   — only sync + install existing APK
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(root, "apps/mobile/android");
const apkPath = path.join(androidDir, "app/build/outputs/apk/debug/app-debug.apk");
const gradlew = path.join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");

function run(cmd, opts = {}) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

function adb(args) {
  const res = spawnSync("adb", args, { encoding: "utf8" });
  return res;
}

function requireAdb() {
  const which = spawnSync("which", ["adb"], { encoding: "utf8" });
  if (which.status !== 0) {
    console.error(`
[mobile:install] adb not found.

Install Android platform-tools:
  brew install android-platform-tools

Then enable USB debugging on the phone and connect via USB.
`);
    process.exit(1);
  }
}

function requireDevice() {
  const devices = adb(["devices"]);
  const lines = devices.stdout
    .split("\n")
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("*"));
  const authorized = lines.filter((l) => l.endsWith("device"));
  if (authorized.length === 0) {
    console.error(`
[mobile:install] No Android device detected.

1. Connect phone via USB
2. Enable Developer options → USB debugging
3. Accept the RSA fingerprint prompt on the phone
4. Run: adb devices
`);
    process.exit(1);
  }
  console.log(`[mobile:install] device: ${authorized[0].split("\t")[0]}`);
}

function setupUsbReverse() {
  for (const port of [4610, 4600]) {
    const res = adb(["reverse", `tcp:${port}`, `tcp:${port}`]);
    if (res.status !== 0) {
      console.warn(`[mobile:install] adb reverse :${port} failed — use Wi‑Fi + CAP_SERVER_URL instead`);
      return false;
    }
    console.log(`[mobile:install] adb reverse tcp:${port} → host`);
  }
  return true;
}

function lanIp() {
  for (const nets of Object.values(os.networkInterfaces())) {
    if (!nets) continue;
    for (const net of nets) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

requireAdb();
requireDevice();

const usbReverse = setupUsbReverse();
const serverUrl =
  process.env.CAP_SERVER_URL?.trim() ||
  (usbReverse ? "http://127.0.0.1:4610" : `http://${lanIp()}:4610`);

console.log(`[mobile:install] Capacitor server URL: ${serverUrl}`);

if (!process.env.SKIP_BUILD) {
  run("npm run build:mobile");
}

run(`CAP_SERVER_URL=${serverUrl} npm run mobile:sync`);

if (!process.env.SKIP_GRADLE) {
  if (!fs.existsSync(gradlew)) {
    console.error("[mobile:install] gradlew missing — run npm run mobile:setup first");
    process.exit(1);
  }
  run(`"${gradlew}" assembleDebug`, { cwd: androidDir });
}

if (!fs.existsSync(apkPath)) {
  console.error(`[mobile:install] APK not found at ${apkPath}`);
  process.exit(1);
}

console.log(`\n[mobile:install] Installing ${apkPath}`);
const install = adb(["install", "-r", apkPath]);
process.stdout.write(install.stdout ?? "");
process.stderr.write(install.stderr ?? "");
if (install.status !== 0) {
  process.exit(install.status ?? 1);
}

console.log(`
✓ Arco OS installed on device.

Next:
  Terminal 1:  npm run dev
  On phone:    open "Arco OS"

USB dev uses adb reverse — phone loads http://127.0.0.1:4610 from your machine.
`);
