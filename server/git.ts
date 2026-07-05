/**
 * Git integration — typed wrappers over the git CLI, always executed in the
 * active project root. Uses execFile (argv, no shell) so file paths and
 * commit messages never need quoting and can't inject.
 *
 * Credentials are whatever the user's own git setup provides (SSH agent,
 * macOS keychain, gh auth): the server runs as the user, so push/pull work
 * exactly like their terminal.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import type { GitFileChange, GitFileState, GitInfo } from "../shared/types.js";
import { getActiveRoot } from "./stores/projectStore.js";

const execFileAsync = promisify(execFile);

/** Run git with argv in the active root; network ops get a longer timeout. */
async function git(args: string[], timeoutMs = 15_000): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync("git", args, {
    cwd: getActiveRoot(),
    timeout: timeoutMs,
    maxBuffer: 10 * 1024 * 1024,
    env: process.env,
  });
}

export async function isGitRepo(): Promise<boolean> {
  try {
    const { stdout } = await git(["rev-parse", "--is-inside-work-tree"]);
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Status
//
// Parsed from `status --porcelain=v2 --branch`: stable, scriptable format.
// XY pairs collapse to one UI state; the staged flag is X !== ".".
// ---------------------------------------------------------------------------

function stateFromXY(xy: string): GitFileState {
  if (xy.includes("U")) return "conflicted";
  const significant = xy[0] !== "." ? xy[0] : xy[1];
  switch (significant) {
    case "A":
      return "added";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    default:
      return "modified";
  }
}

export async function gitInfo(): Promise<GitInfo> {
  const empty: GitInfo = { isRepo: false, branch: "", ahead: 0, behind: 0, upstream: "", changes: [] };
  if (!(await isGitRepo())) return empty;

  const { stdout } = await git(["status", "--porcelain=v2", "--branch"]);
  const info: GitInfo = { ...empty, isRepo: true };
  const changes: GitFileChange[] = [];

  for (const line of stdout.split("\n")) {
    if (line.startsWith("# branch.head")) {
      info.branch = line.slice("# branch.head ".length).trim();
    } else if (line.startsWith("# branch.upstream")) {
      info.upstream = line.slice("# branch.upstream ".length).trim();
    } else if (line.startsWith("# branch.ab")) {
      const m = /\+(\d+) -(\d+)/.exec(line);
      if (m) {
        info.ahead = Number(m[1]);
        info.behind = Number(m[2]);
      }
    } else if (line.startsWith("1 ") || line.startsWith("2 ")) {
      // "1 XY sub mH mI mW hH hI path" / "2 ... path\torigPath"
      const parts = line.split(" ");
      const xy = parts[1];
      const rest = parts.slice(8).join(" ");
      const filePath = line.startsWith("2 ") ? rest.split("\t")[0] : rest;
      changes.push({ path: filePath, state: stateFromXY(xy), staged: xy[0] !== "." });
    } else if (line.startsWith("? ")) {
      changes.push({ path: line.slice(2), state: "untracked", staged: false });
    } else if (line.startsWith("u ")) {
      const parts = line.split(" ");
      changes.push({ path: parts.slice(10).join(" "), state: "conflicted", staged: false });
    }
  }

  info.changes = changes.sort((a, b) => a.path.localeCompare(b.path));
  return info;
}

// ---------------------------------------------------------------------------
// Diff content
//
// Returns before/after snapshots (HEAD vs working tree) rather than a unified
// diff string — the client renders them in a Monaco DiffEditor, which wants
// full texts.
// ---------------------------------------------------------------------------

export async function gitFileDiff(relPath: string): Promise<{ before: string | null; after: string | null }> {
  let before: string | null = null;
  try {
    const { stdout } = await git(["show", `HEAD:${relPath}`]);
    before = stdout;
  } catch {
    // Not in HEAD — new/untracked file.
  }
  let after: string | null = null;
  try {
    after = await fs.readFile(path.join(getActiveRoot(), relPath), "utf-8");
  } catch {
    // Deleted from the working tree.
  }
  return { before, after };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Stage everything (or the given paths) and commit. */
export async function gitCommit(message: string, paths?: string[]): Promise<{ ok: true; output: string }> {
  if (paths && paths.length > 0) {
    await git(["add", "--", ...paths]);
  } else {
    await git(["add", "-A"]);
  }
  const { stdout } = await git(["commit", "-m", message]);
  return { ok: true, output: stdout.trim() };
}

export async function gitPush(): Promise<{ ok: true; output: string }> {
  // -u covers the first push of a new branch; harmless otherwise.
  const { stdout, stderr } = await git(["push", "-u", "origin", "HEAD"], 60_000);
  return { ok: true, output: (stdout + stderr).trim() };
}

export async function gitPull(): Promise<{ ok: true; output: string }> {
  const { stdout, stderr } = await git(["pull", "--ff-only"], 60_000);
  return { ok: true, output: (stdout + stderr).trim() };
}
