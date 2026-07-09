import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor loads the shared Arco Vite build from ../../dist.
 *
 * Thin client (bundled): UI in APK, user picks remote server at first run.
 *   npm run mobile:bundle
 *
 * Local sidecar (embedded Node): full Arco backend on device, WebView → localhost:4600.
 *   MOBILE_LOCAL=1 npm run mobile:local:bundle
 *
 * Dev proxy: CAP_SERVER_URL=http://10.0.2.2:4610 npm run mobile:sync:dev
 */
const devServerUrl = process.env.CAP_SERVER_URL?.trim() || undefined;
const isLocalSidecar = process.env.MOBILE_LOCAL === "1";

/** Launcher labels — must stay in sync with scripts/setup-mobile-android.mjs */
export const MOBILE_APP_FLAVOR = isLocalSidecar
  ? { appId: "com.arco.os.mobile.local", appName: "Arco Local" }
  : { appId: "com.arco.os.mobile", appName: "Arco Connect" };

const config: CapacitorConfig = {
  appId: MOBILE_APP_FLAVOR.appId,
  appName: MOBILE_APP_FLAVOR.appName,
  webDir: "../../dist",
  server: devServerUrl
    ? {
        url: devServerUrl,
        cleartext: devServerUrl.startsWith("http://"),
        androidScheme: devServerUrl.startsWith("https://") ? "https" : "http",
      }
    : {
        // http://localhost so WebView can reach LAN http:// backends (no mixed-content block).
        androidScheme: "http",
        // Keep embedded sidecar navigation inside the app WebView (not external Chrome).
        allowNavigation: ["127.0.0.1", "localhost"],
      },
  android: {
    allowMixedContent: true,
  },
  plugins: isLocalSidecar
    ? {
        CapacitorNodeJS: {
          nodeDir: "nodejs",
          startMode: "auto",
        },
      }
    : undefined,
};

export default config;
