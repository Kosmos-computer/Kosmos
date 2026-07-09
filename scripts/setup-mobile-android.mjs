#!/usr/bin/env node
/**
 * Post-init patches for the Capacitor Android project:
 * - Allow cleartext HTTP to host dev server (10.0.2.2 / LAN IP)
 * - networkSecurityConfig for emulator dev
 */
import { execSync } from "node:child_process";
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

const mainActivityPath = path.join(
  androidRoot,
  "app/src/main/java/com/arco/os/mobile/MainActivity.java",
);
const mainActivitySource = `package com.arco.os.mobile;

import android.content.pm.ApplicationInfo;
import android.net.http.SslError;
import android.webkit.SslErrorHandler;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/** Debug builds trust the Vite dev server's self-signed HTTPS cert. */
public class MainActivity extends BridgeActivity {

  @Override
  public void onStart() {
    super.onStart();
    if (this.bridge == null || !isDebuggable()) {
      return;
    }

    WebView webView = this.bridge.getWebView();
    webView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    webView.setWebViewClient(
        new BridgeWebViewClient(this.bridge) {
          @Override
          public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            handler.proceed();
          }
        });
  }

  private boolean isDebuggable() {
    return (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
  }
}
`;

fs.mkdirSync(path.dirname(mainActivityPath), { recursive: true });
const existing = fs.existsSync(mainActivityPath) ? fs.readFileSync(mainActivityPath, "utf8") : "";
if (!existing.includes("onReceivedSslError")) {
  fs.writeFileSync(mainActivityPath, mainActivitySource);
  console.log("[mobile:patch] Patched MainActivity for dev HTTPS (self-signed cert)");
} else if (!existing.includes("MIXED_CONTENT_ALWAYS_ALLOW")) {
  const withMixed = existing.replace(
    "WebView webView = this.bridge.getWebView();",
    "WebView webView = this.bridge.getWebView();\n    webView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);",
  );
  if (!withMixed.includes("import android.webkit.WebSettings;")) {
    const withImport = withMixed.replace(
      "import android.webkit.WebView;",
      "import android.webkit.WebSettings;\nimport android.webkit.WebView;",
    );
    fs.writeFileSync(mainActivityPath, withImport);
  } else {
    fs.writeFileSync(mainActivityPath, withMixed);
  }
  console.log("[mobile:patch] Patched MainActivity for mixed-content LAN APIs");
}

const iconsScript = path.join(root, "scripts/generate-mobile-android-icons.mjs");
if (fs.existsSync(iconsScript)) {
  execSync(`node "${iconsScript}"`, { stdio: "inherit", cwd: root });
}
