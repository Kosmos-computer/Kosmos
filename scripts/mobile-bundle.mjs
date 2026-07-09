#!/usr/bin/env node
/**
 * Build a bundled mobile APK — UI in the APK, server chosen at first run in the app.
 * No CAP_SERVER_URL / Mac dev server baked in.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(root, "apps/mobile/android");
const apkPath = path.join(androidDir, "app/build/outputs/apk/debug/app-debug.apk");
const gradlew = path.join(androidDir, process.platform === "win32" ? "gradlew.bat" : "gradlew");
const javaHome =
  process.env.JAVA_HOME ??
  "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home";
const downloadsDir = path.join(root, "public/downloads");

function run(cmd, opts = {}) {
  console.log(`\n→ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

console.log("[mobile:bundle] Building bundled mobile UI (server profile at first run)…");
run("npm run build:mobile");
run("npm run mobile:icons");
run("npm run mobile:sync");

const capConfigPath = path.join(androidDir, "app/src/main/assets/capacitor.config.json");
if (fs.existsSync(capConfigPath)) {
  const capConfig = JSON.parse(fs.readFileSync(capConfigPath, "utf8"));
  if (capConfig.server?.url) {
    console.error(
      `[mobile:bundle] Bundled APK must load from packaged assets, not ${capConfig.server.url}.`,
    );
    console.error("[mobile:bundle] Use npm run mobile:sync (not mobile:sync:dev) without CAP_SERVER_URL.");
    process.exit(1);
  }
}

run(`"${gradlew}" assembleDebug`, {
  cwd: androidDir,
  env: { ...process.env, JAVA_HOME: javaHome },
});

if (!fs.existsSync(apkPath)) {
  console.error("[mobile:bundle] APK missing after build");
  process.exit(1);
}

fs.mkdirSync(downloadsDir, { recursive: true });
const dest = path.join(downloadsDir, "arco-os-mobile-bundled.apk");
fs.copyFileSync(apkPath, dest);
console.log(`
✓ Bundled APK ready: ${dest}

Install via ADB or copy to device. On first open, enter your server URL
(Coolify, Tailscale, LAN, or Chromebook Linux). No Mac dev server required.
`);
