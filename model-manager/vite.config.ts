import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Port 4620 keeps clear of Arco's server (4600) and web (4610).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 4620,
    strictPort: true,
  },
  build: {
    outDir: "dist",
  },
});
