import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "electron";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/** PNG app icon (1024) — run `npm run icon -w @arco/desktop` to regenerate. */
export function appIconPath(): string {
  return path.join(moduleDir, "../build/icon.png");
}

/** Repo root in dev; bundled resources root when packaged. */
export function repoRoot(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "arco");
  }
  return path.resolve(moduleDir, "../../..");
}

/** User-scoped Arco data directory (settings, apps, sessions, workspace). */
export function desktopDataDir(): string {
  return path.join(app.getPath("userData"), "data");
}
