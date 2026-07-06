import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = path.dirname(fileURLToPath(import.meta.url));

// Port 4620 keeps clear of Arco's server (4600) and web (4610).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@arco": path.resolve(root, "../src"),
    },
  },
  clearScreen: false,
  server: {
    port: 4620,
    strictPort: true,
  },
  build: {
    outDir: "dist",
  },
});
