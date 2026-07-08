/**
 * Clone a GitHub (or other git) repository into the managed workspace
 * projects directory — the OpenHands-style "Open a Repository" flow for
 * hosted and local backends where the user cannot pick folders natively.
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { dataDirs } from "./env.js";

const execFileAsync = promisify(execFile);

const OWNER_REPO_RE = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;
const GITHUB_URL_RE =
  /^(?:https?:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:[/#?].*)?$/i;

export function parseGitRef(ref: string): { url: string; name: string } {
  const trimmed = ref.trim();
  if (!trimmed) throw new Error("Repository reference is required");

  const ownerRepo = OWNER_REPO_RE.exec(trimmed);
  if (ownerRepo) {
    const [, owner, repo] = ownerRepo;
    return { url: `https://github.com/${owner}/${repo}.git`, name: repo };
  }

  const github = GITHUB_URL_RE.exec(trimmed);
  if (github) {
    const [, owner, repo] = github;
    return { url: `https://github.com/${owner}/${repo}.git`, name: repo };
  }

  if (trimmed.startsWith("https://") || trimmed.startsWith("git@") || trimmed.startsWith("ssh://")) {
    const name = path.basename(trimmed).replace(/\.git$/, "") || "repo";
    const url = trimmed.endsWith(".git") ? trimmed : `${trimmed}.git`;
    return { url, name };
  }

  throw new Error("Enter owner/repo (e.g. openhands/openhands) or a git clone URL");
}

/** Clone into data/workspace/projects and return the absolute destination path. */
export async function cloneGitRepo(
  ref: string,
  branch?: string,
  accessToken?: string,
): Promise<string> {
  const { url: rawUrl, name } = parseGitRef(ref);
  const token = accessToken?.trim() || process.env.GITHUB_TOKEN?.trim();
  const url =
    token && rawUrl.startsWith("https://github.com/")
      ? rawUrl.replace("https://", `https://x-access-token:${token}@`)
      : rawUrl;
  const base = path.join(dataDirs.workspace, "projects");
  fs.mkdirSync(base, { recursive: true });

  let dest = path.join(base, name);
  let suffix = 2;
  while (fs.existsSync(dest)) {
    dest = path.join(base, `${name}-${suffix++}`);
  }

  const args = ["clone", "--depth", "1"];
  const branchName = branch?.trim();
  if (branchName) args.push("--branch", branchName, "--single-branch");
  args.push(url, dest);

  try {
    await execFileAsync("git", args, {
      timeout: 180_000,
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
      },
    });
  } catch (err) {
    fs.rmSync(dest, { recursive: true, force: true });
    const message = err instanceof Error ? err.message : "Clone failed";
    if (message.includes("Authentication failed") || message.includes("could not read Username")) {
      throw new Error(
        "Clone failed — private repos need a token. Set GITHUB_TOKEN on the server or use a public repo.",
      );
    }
    throw new Error(`Clone failed: ${message}`);
  }

  return dest;
}
