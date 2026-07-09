#!/usr/bin/env node
/**
 * Post-init patches for the Capacitor Android project:
 * - Allow cleartext HTTP to host dev server (10.0.2.2 / LAN IP)
 * - networkSecurityConfig for emulator dev
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidRoot = path.join(root, "apps/mobile/android");
const manifestPath = path.join(androidRoot, "app/src/main/AndroidManifest.xml");
const xmlDir = path.join(androidRoot, "app/src/main/res/xml");
const networkConfigPath = path.join(xmlDir, "network_security_config.xml");

if (!fs.existsSync(manifestPath)) {
  console.warn("[mobile:patch] Android project not found — run npm run mobile:setup first");
  process.exit(0);
}

fs.mkdirSync(xmlDir, { recursive: true });
fs.writeFileSync(
  networkConfigPath,
  `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
`,
);

let manifest = fs.readFileSync(manifestPath, "utf8");
if (!manifest.includes("networkSecurityConfig")) {
  manifest = manifest.replace(
    "<application",
    '<application android:networkSecurityConfig="@xml/network_security_config" android:usesCleartextTraffic="true"',
  );
  fs.writeFileSync(manifestPath, manifest);
  console.log("[mobile:patch] Patched AndroidManifest for cleartext dev traffic");
} else {
  console.log("[mobile:patch] AndroidManifest already patched");
}
