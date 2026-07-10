/**
 * Workspace picker capabilities — tells the client which open-folder flows
 * are available on this host (native Finder vs in-app browse vs git clone).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { WorkspaceFeatures } from "../../shared/types.js";
import { dataDirs } from "../env.js";
import { isGitHubOAuthConfigured } from "../github/githubOAuth.js";
import { getKosmosDeployment } from "./kosmosDeployment.js";

const execFileAsync = promisify(execFile);

async function nativeFolderPickerAvailable(): Promise<boolean> {
  if (process.platform !== "darwin") return false;
  try {
    await execFileAsync("which", ["osascript"]);
    return true;
  } catch {
    return false;
  }
}

export function isHostedRuntime(): boolean {
  if (process.env.ARCO_HOSTED === "1") return true;
  if (process.env.ARCO_MOBILE_LOCAL === "1") return true;
  if (fs.existsSync("/.dockerenv")) return true;
  // Linux servers (Coolify, VPS) cannot open the user's local Finder.
  return process.platform === "linux";
}

export async function getWorkspaceFeatures(): Promise<WorkspaceFeatures> {
  const hosted = isHostedRuntime();
  const nativeFolderPicker = await nativeFolderPickerAvailable();
  const projectsDir = path.join(dataDirs.workspace, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });

  return {
    nativeFolderPicker,
    hosted,
    defaultBrowsePath: hosted ? projectsDir : os.homedir(),
    githubClone: true,
    githubOAuthConfigured: isGitHubOAuthConfigured(),
    kosmos: getKosmosDeployment(hosted),
  };
}
