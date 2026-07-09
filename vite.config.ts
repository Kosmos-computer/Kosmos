import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { fileURLToPath } from "node:url";

const lan = process.env.ARCO_LAN === "1";
const https = process.env.ARCO_HTTPS === "1";

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
    proxy: {
      "/api": {
        target: "http://localhost:4600",
        changeOrigin: true,
      },
      // Installed-app bundles + the app SDK are served by the Arco server.
      "/apps": {
        target: "http://localhost:4600",
        changeOrigin: true,
      },
      "/app-sdk.js": {
        target: "http://localhost:4600",
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
  },
});
