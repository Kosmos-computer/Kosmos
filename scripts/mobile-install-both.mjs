#!/usr/bin/env node
/**
 * Build and install BOTH Android flavors side by side on a USB-connected device.
 *
 *   npm run mobile:install:both
 *
 * Installs:
 *   • Arco Connect  (com.arco.os.mobile)       — thin client
 *   • Arco Local    (com.arco.os.mobile.local) — embedded Node backend
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { MOBILE_APK } from "./mobile-apk-paths.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root });
}

function adb(args) {
  return spawnSync("adb", args, { encoding: "utf8" });
}

const devices = adb(["devices"]);
const authorized = devices.stdout
  .split("\n")
  .slice(1)
  .map((l) => l.trim())
  .filter((l) => l.endsWith("device"));
if (authorized.length === 0) {
  console.error("[mobile:install:both] No authorized Android device on USB");
  process.exit(1);
}

if (!process.env.SKIP_BUILD) {
  run("npm run mobile:bundle");
  run("npm run mobile:local:bundle");
}

for (const [label, apkPath] of [
  ["Arco Connect", MOBILE_APK.connect],
  ["Arco Local", MOBILE_APK.local],
]) {
  if (!fs.existsSync(apkPath)) {
    console.error(`[mobile:install:both] Missing ${label} APK: ${apkPath}`);
    process.exit(1);
  }
  console.log(`\n[mobile:install:both] Installing ${label}`);
  const install = adb(["install", "-r", apkPath]);
  process.stdout.write(install.stdout ?? "");
  process.stderr.write(install.stderr ?? "");
  if (install.status !== 0) {
    process.exit(install.status ?? 1);
  }
}

console.log(`
✓ Both apps installed on ${authorized[0].split("\t")[0]}.

Look for two launcher icons:
  • Arco Connect — remote server client
  • Arco Local   — full stack on device
`);
