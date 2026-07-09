import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor loads the shared Arco Vite build from ../../dist.
 *
 * Dev on emulator (backend + Vite on host):
 *   CAP_SERVER_URL=http://10.0.2.2:4610 npm run mobile:sync
 *
 * Dev on physical device (replace with your LAN IP):
 *   CAP_SERVER_URL=http://192.168.1.42:4610 npm run mobile:sync
 *
 * Production/static bundle with remote API — build with:
 *   VITE_ARCO_SHELL_PROFILE=mobile VITE_ARCO_API_URL=https://your-server npm run build:mobile
 */
const devServerUrl = process.env.CAP_SERVER_URL?.trim() || undefined;

const config: CapacitorConfig = {
  appId: "com.arco.os.mobile",
  appName: "Arco OS",
  webDir: "../../dist",
  server: devServerUrl
    ? {
        url: devServerUrl,
        cleartext: devServerUrl.startsWith("http://"),
        androidScheme: devServerUrl.startsWith("https://") ? "https" : "http",
      }
    : {
        androidScheme: "https",
      },
  android: {
    allowMixedContent: true,
  },
};

export default config;
