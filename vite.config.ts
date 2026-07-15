import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { fileURLToPath } from "node:url";

const lan = process.env.ARCO_LAN === "1";
const https = process.env.ARCO_HTTPS === "1";
const apiPort = Number(process.env.PORT ?? 4600);
const apiOrigin = `http://localhost:${apiPort}`;

export default defineConfig({
  plugins: [react(), ...(https ? [basicSsl()] : [])],
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
      "@arco/platform-bridge": fileURLToPath(
        new URL("./packages/platform-bridge/src/index.ts", import.meta.url),
      ),
      "@arco/editor-kit/styles.css": fileURLToPath(
        new URL("./packages/editor-kit/src/editor.css", import.meta.url),
      ),
      "@arco/editor-kit": fileURLToPath(new URL("./packages/editor-kit/src/index.ts", import.meta.url)),
    },
  },
  server: {
    host: lan ? "0.0.0.0" : "127.0.0.1",
    port: 4610,
    strictPort: true,
    https,
    watch: {
      // Arco writes live runtime state under ./data (sessions, settings,
      // workspace, generated apps). Those writes are app state, not source,
      // and should not trigger a Vite full reload.
      ignored: ["**/data/**", "**/.codex/**"],
    },
    proxy: {
      "/api": {
        target: apiOrigin,
        changeOrigin: true,
        // Keep EventSource (/api/shell-events) and chat SSE alive through the
        // Vite proxy — default timeouts and buffered closes mark voice turns
        // headless even when the desktop UI is open.
        timeout: 0,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, _req, res) => {
            res.on("close", () => {
              if (!res.writableEnded) proxyReq.destroy();
            });
          });
        },
      },
      // Installed-app bundles + the app SDK are served by the Arco server.
      "/apps": {
        target: apiOrigin,
        changeOrigin: true,
      },
      "/app-sdk.js": {
        target: apiOrigin,
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ["pdfjs-dist"],
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      // Mobile-only; not installed in the server/Docker image.
      external: ["capacitor-nodejs"],
    },
  },
});
