#!/usr/bin/env node
/**
 * Build + install Arco mobile on a USB-connected iPhone (Capacitor iOS).
 *
 * Bundled mode (default): UI in app, server URL chosen at first run.
 *   npm run mobile:ios:install
 *
 * Dev mode: WebView loads from Mac Vite on LAN (phone and Mac on same Wi‑Fi).
 *   npm run dev:mobile          # terminal 1
 *   npm run mobile:ios:install:dev   # terminal 2
 *
 * Env:
 *   MOBILE_DEV=1       — load UI from Mac Vite (skip bundled build)
 *   CAP_SERVER_URL   — override WebView entry (dev mode only)
 *   SKIP_BUILD=1       — skip vite build
 *   SKIP_XCODE=1       — only sync + install existing .app
 *   IOS_DEVICE_ID    — override target UDID (default: first connected iPhone)
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iosAppDir = path.join(root, "apps/mobile/ios/App");
const workspace = path.join(iosAppDir, "App.xcworkspace");
const scheme = "App";
const bundled = process.env.MOBILE_BUNDLED === "1" || process.env.MOBILE_DEV !== "1";

function run(cmd, opts = {}) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" },
    ...opts,
  });
}

function spawn(cmd, args) {
  return spawnSync(cmd, args, { encoding: "utf8", env: { ...process.env, LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" } });
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

function detectLocalDevServerUrl(host = lanIp()) {
  return new Promise((resolve) => {
    const req = https.request(
      { host, port: 4610, path: "/", method: "HEAD", rejectUnauthorized: false, timeout: 1500 },
      () => resolve(`https://${host}:4610`),
    );
    req.on("error", () => {
      const httpReq = http.request(
        { host, port: 4610, path: "/", method: "HEAD", timeout: 1500 },
        () => resolve(`http://${host}:4610`),
      );
      httpReq.on("error", () => resolve(`http://${host}:4610`));
      httpReq.on("timeout", () => {
        httpReq.destroy();
        resolve(`http://${host}:4610`);
      });
      httpReq.end();
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(`http://${host}:4610`);
    });
    req.end();
  });
}

function listIosDevices() {
  const res = spawn("npx", ["cap", "run", "ios", "--list"]);
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout);
    process.exit(1);
  }
  const lines = (res.stdout || "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("Name") && !l.startsWith("-"));
  const physical = lines.filter((l) => !l.includes("(simulator)"));
  return physical.map((line) => {
    const parts = line.split(/\s{2,}/);
    const name = parts[0]?.trim() ?? "iPhone";
    const targetId = parts[parts.length - 1]?.trim();
    return { name, targetId };
  }).filter((d) => d.targetId);
}

function requireDevice() {
  if (process.env.IOS_DEVICE_ID?.trim()) {
    return process.env.IOS_DEVICE_ID.trim();
  }
  const devices = listIosDevices();
  if (devices.length === 0) {
    console.error(`
[mobile:ios:install] No iPhone detected.

1. Connect iPhone via USB
2. Unlock the phone
3. Tap "Trust This Computer" if prompted
4. In Xcode: Window → Devices and Simulators — confirm the device is paired
`);
    process.exit(1);
  }
  console.log(`[mobile:ios:install] device: ${devices[0].name} (${devices[0].targetId})`);
  return devices[0].targetId;
}

function findBuiltApp() {
  const derivedRoot = path.join(root, "apps/mobile/ios/DerivedData");
  if (fs.existsSync(derivedRoot)) {
    for (const entry of fs.readdirSync(derivedRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(
        derivedRoot,
        entry.name,
        "Build/Products/Debug-iphoneos/App.app",
      );
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  const xcodeDerived = path.join(
    os.homedir(),
    "Library/Developer/Xcode/DerivedData",
  );
  if (fs.existsSync(xcodeDerived)) {
    const matches = fs
      .readdirSync(xcodeDerived)
      .filter((name) => name.startsWith("App-"))
      .map((name) =>
        path.join(xcodeDerived, name, "Build/Products/Debug-iphoneos/App.app"),
      )
      .filter((p) => fs.existsSync(p))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (matches[0]) return matches[0];
  }
  return null;
}

const deviceId = requireDevice();

if (bundled) {
  console.log("[mobile:ios:install] Bundled mode — server URL chosen in app at first run");
  if (!process.env.SKIP_BUILD) {
    run("npm run mobile:bundle");
  } else {
    run("npm run cap -w @arco/mobile sync ios");
  }
} else {
  const serverUrl =
    process.env.CAP_SERVER_URL?.trim() || (await detectLocalDevServerUrl());
  console.log(`[mobile:ios:install] Dev mode — Capacitor server URL: ${serverUrl}`);
  if (!process.env.SKIP_BUILD) {
    run("npm run build:mobile");
  }
  run(`CAP_SERVER_URL=${serverUrl} npm run cap -w @arco/mobile sync ios`);
}

if (!process.env.SKIP_XCODE) {
  const derived = path.join(root, "apps/mobile/ios/DerivedData", deviceId);
  run(
    `xcodebuild -workspace "${workspace}" -scheme ${scheme} -configuration Debug -destination "platform=iOS,id=${deviceId}" -derivedDataPath "${derived}" -allowProvisioningUpdates build`,
    { cwd: iosAppDir },
  );
}

const appPath = findBuiltApp();
if (!appPath) {
  console.error("[mobile:ios:install] Built App.app not found — build failed?");
  process.exit(1);
}

console.log(`\n[mobile:ios:install] Installing ${appPath}`);
const install = spawn("xcrun", [
  "devicectl",
  "device",
  "install",
  "app",
  "--device",
  deviceId,
  appPath,
]);
process.stdout.write(install.stdout ?? "");
process.stderr.write(install.stderr ?? "");
if (install.status !== 0) {
  console.error(`
[mobile:ios:install] Install failed — is the iPhone unlocked and trusted?

On iPhone: unlock → tap "Trust This Computer"
In Xcode: Window → Devices and Simulators → select your iPhone → ensure it shows as connected

Then re-run: npm run mobile:ios:install
`);
  process.exit(install.status ?? 1);
}

const launch = spawn("xcrun", [
  "devicectl",
  "device",
  "process",
  "launch",
  "--device",
  deviceId,
  "com.arco.os.mobile",
]);
process.stdout.write(launch.stdout ?? "");
process.stderr.write(launch.stderr ?? "");

console.log(bundled
  ? `
✓ Arco OS installed on iPhone.

Open the app → enter your server URL (e.g. http://${lanIp()}:4600 on same Wi‑Fi).
Keep npm run dev:server running on your Mac, or point at a hosted server.
`
  : `
✓ Arco OS installed on iPhone (dev mode).

Next:
  Terminal 1:  npm run dev:mobile
  On iPhone:   open "Arco OS"
`);
