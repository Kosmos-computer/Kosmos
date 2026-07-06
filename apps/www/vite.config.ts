import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@brand": fileURLToPath(new URL("../../src/components", import.meta.url)),
      "@arco/wallpaper": fileURLToPath(new URL("../../src/os/wallpaper", import.meta.url)),
      "@shared": fileURLToPath(new URL("../../shared", import.meta.url)),
    },
  },
  server: {
    port: 5174,
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        spec: fileURLToPath(new URL("./spec.html", import.meta.url)),
      },
    },
  },
});
