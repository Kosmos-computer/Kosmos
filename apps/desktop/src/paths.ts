import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "electron";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

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
