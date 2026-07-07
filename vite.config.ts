import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
      "@arco/editor-kit/styles.css": fileURLToPath(
        new URL("./packages/editor-kit/src/editor.css", import.meta.url),
      ),
      "@arco/editor-kit": fileURLToPath(new URL("./packages/editor-kit/src/index.ts", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 4610,
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
