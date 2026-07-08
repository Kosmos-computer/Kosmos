import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

function readTokenFile(filePath: string): string | undefined {
  try {
    const value = fs.readFileSync(filePath, "utf8").trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

/** Resolve a GitHub PAT for electron-updater when releases live in a private repo. */
export function resolveGithubUpdateToken(): string | undefined {
  const fromEnv =
    process.env.ARCO_UPDATE_GH_TOKEN?.trim() ||
    process.env.DESKTOP_UPDATE_GH_TOKEN?.trim() ||
    process.env.GH_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim();

  if (fromEnv) return fromEnv;

  const userToken = readTokenFile(path.join(app.getPath("userData"), "update-gh-token"));
  if (userToken) return userToken;

  const resourcesPath = process.resourcesPath;
  if (resourcesPath) {
    return readTokenFile(path.join(resourcesPath, "update-gh-token"));
  }

  return undefined;
}

export const PRIVATE_GITHUB_UPDATE_HINT =
  "Arco releases are in a private GitHub repo. Add a read-only GitHub token to " +
  "~/Library/Application Support/@arco/desktop/update-gh-token or set ARCO_UPDATE_GH_TOKEN, then check again.";
