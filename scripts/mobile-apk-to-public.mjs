#!/usr/bin/env node
/** Build debug APK and copy to public/downloads/ for browser download. */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apkSrc = path.join(
  root,
  "apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk",
);
const apkDest = path.join(root, "public/downloads/arco-os-mobile.apk");
const javaHome =
  process.env.JAVA_HOME ??
  "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home";

function run(cmd, opts = {}) {
  console.log(`→ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

run("npm run build:mobile");
run(`CAP_SERVER_URL=${process.env.CAP_SERVER_URL ?? "http://127.0.0.1:4610"} npm run mobile:sync`);

if (!fs.existsSync(apkSrc)) {
  run(`"${path.join(root, "apps/mobile/android/gradlew")}" assembleDebug`, {
    cwd: path.join(root, "apps/mobile/android"),
    env: { ...process.env, JAVA_HOME: javaHome },
  });
} else {
  run(`"${path.join(root, "apps/mobile/android/gradlew")}" assembleDebug`, {
    cwd: path.join(root, "apps/mobile/android"),
    env: { ...process.env, JAVA_HOME: javaHome },
  });
}

if (!fs.existsSync(apkSrc)) {
  console.error("[mobile:apk] APK not found after gradle build");
  process.exit(1);
}

fs.mkdirSync(path.dirname(apkDest), { recursive: true });
fs.copyFileSync(apkSrc, apkDest);
console.log(`\n✓ APK ready: public/downloads/arco-os-mobile.apk`);
console.log(`  Download page: /mobile-install.html`);
