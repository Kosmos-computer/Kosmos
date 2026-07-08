#!/usr/bin/env node
/**
 * Stage a GitHub token file for private-repo auto-updates (read at runtime).
 * CI should set DESKTOP_UPDATE_GH_TOKEN to a read-only PAT with repo contents access.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tokenPath = path.join(desktopRoot, "build/update-gh-token");
const token = process.env.DESKTOP_UPDATE_GH_TOKEN?.trim() ?? "";

fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
fs.writeFileSync(tokenPath, token, { mode: 0o600 });

if (token) {
  console.log("[desktop-release] staged private GitHub update token");
} else {
  console.warn(
    "[desktop-release] DESKTOP_UPDATE_GH_TOKEN not set — auto-update will not work against private GitHub releases",
  );
}
