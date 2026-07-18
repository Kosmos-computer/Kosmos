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
import type { GitBranchInfo, GitFileChange, GitFileState, GitInfo, GitWorktreeInfo } from "../shared/types.js";
import { getActiveRoot, getWorkspaceBackend, workspaceStore } from "./stores/workspaceStore.js";

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

  // -uall expands untracked directories into individual files so the UI can open
  // a real before/after diff instead of a directory stub with no content.
  const { stdout } = await git(["status", "--porcelain=v2", "--branch", "-uall"]);
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
// full texts. Directories / binaries / huge files are marked unavailable so
// the client can show a reason instead of an empty editor.
// ---------------------------------------------------------------------------

export type GitFileDiffResult = {
  before: string | null;
  after: string | null;
  unavailable?: "directory" | "binary" | "too_large";
};

/** Null-byte sniff — good enough to keep Monaco away from apk/wasm/etc. */
async function looksBinary(abs: string): Promise<boolean> {
  const fh = await fs.open(abs, "r");
  try {
    const buf = Buffer.alloc(8192);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    return buf.subarray(0, bytesRead).includes(0);
  } finally {
    await fh.close();
  }
}

const MAX_DIFF_BYTES = 1_500_000;

export async function gitFileDiff(relPath: string): Promise<GitFileDiffResult> {
  const abs = path.join(getActiveRoot(), relPath);
  let st: Awaited<ReturnType<typeof fs.stat>> | null = null;
  try {
    st = await fs.stat(abs);
  } catch {
    st = null;
  }

  if (st?.isDirectory() || relPath.endsWith("/")) {
    return { before: null, after: null, unavailable: "directory" };
  }

  if (st?.isFile()) {
    if (st.size > MAX_DIFF_BYTES) {
      return { before: null, after: null, unavailable: "too_large" };
    }
    if (await looksBinary(abs)) {
      return { before: null, after: null, unavailable: "binary" };
    }
  }

  let before: string | null = null;
  try {
    const { stdout } = await git(["show", `HEAD:${relPath}`]);
    before = stdout;
  } catch {
    // Not in HEAD — new/untracked file.
  }

  // HEAD-only binary/huge (deleted from tree or never read via working copy).
  if (before != null) {
    if (Buffer.byteLength(before, "utf8") > MAX_DIFF_BYTES) {
      return { before: null, after: null, unavailable: "too_large" };
    }
    if (before.includes("\0")) {
      return { before: null, after: null, unavailable: "binary" };
    }
  }

  let after: string | null = null;
  if (st?.isFile()) {
    try {
      after = await fs.readFile(abs, "utf-8");
    } catch {
      after = null;
    }
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

function assertLocalGit(): void {
  if (getWorkspaceBackend() === "drive") {
    throw new Error("Git is unavailable while the Studio workspace backend is Drive");
  }
}

/** Local branches plus remote-tracking refs (unique short names). */
export async function gitBranches(): Promise<GitBranchInfo[]> {
  assertLocalGit();
  if (!(await isGitRepo())) return [];

  const { stdout: localOut } = await git(["branch", "--format=%(refname:short)%09%(HEAD)"]);
  const { stdout: remoteOut } = await git(["branch", "-r", "--format=%(refname:short)"]);
  const byName = new Map<string, GitBranchInfo>();

  for (const line of localOut.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [name, head] = trimmed.split("\t");
    if (!name || name.includes("HEAD")) continue;
    byName.set(name, { name, current: head === "*", remote: false });
  }

  for (const line of remoteOut.split("\n")) {
    const name = line.trim();
    if (!name || name.endsWith("/HEAD") || name.includes("->")) continue;
    // Prefer local entry when both exist.
    if (!byName.has(name) && !byName.has(name.replace(/^origin\//, ""))) {
      const short = name.replace(/^origin\//, "");
      if (!byName.has(short)) {
        byName.set(name, { name, current: false, remote: true });
      }
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function gitCheckout(
  branch: string,
  create = false,
): Promise<{ ok: true; branch: string }> {
  assertLocalGit();
  const name = branch.trim();
  if (!name) throw new Error("branch is required");
  if (create) {
    await git(["checkout", "-b", name]);
  } else if (name.startsWith("origin/")) {
    const local = name.replace(/^origin\//, "");
    await git(["checkout", "-B", local, "--track", name]);
  } else {
    await git(["checkout", name]);
  }
  return { ok: true, branch: name.replace(/^origin\//, "") };
}

/** Parse `git worktree list --porcelain`. */
export async function gitWorktrees(): Promise<GitWorktreeInfo[]> {
  assertLocalGit();
  if (!(await isGitRepo())) return [];
  const { stdout } = await git(["worktree", "list", "--porcelain"]);
  const trees: GitWorktreeInfo[] = [];
  let current: Partial<GitWorktreeInfo> = {};
  for (const line of stdout.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (current.path) {
        trees.push({
          path: current.path,
          branch: current.branch ?? "",
          bare: current.bare ?? false,
        });
      }
      current = { path: line.slice("worktree ".length), bare: false, branch: "" };
    } else if (line.startsWith("branch ")) {
      current.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
    } else if (line === "bare") {
      current.bare = true;
    } else if (line === "") {
      if (current.path) {
        trees.push({
          path: current.path,
          branch: current.branch ?? "",
          bare: current.bare ?? false,
        });
        current = {};
      }
    }
  }
  if (current.path) {
    trees.push({
      path: current.path,
      branch: current.branch ?? "",
      bare: current.bare ?? false,
    });
  }
  return trees;
}

function gitErrMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { stderr?: unknown; message?: unknown };
    const stderr = typeof e.stderr === "string" ? e.stderr : "";
    const message = typeof e.message === "string" ? e.message : "";
    return `${stderr}\n${message}`.trim();
  }
  return String(err);
}

/** Pick a branch name that does not already exist locally. */
async function uniqueWorktreeBranch(base: string): Promise<string> {
  const stamp = Date.now().toString(36);
  const candidates = [`${base}-wt`, `arco/${base}-wt`, `arco/${base}-wt-${stamp}`];
  for (const name of candidates) {
    try {
      await git(["show-ref", "--verify", "--quiet", `refs/heads/${name}`]);
      // ref exists — try next
    } catch {
      return name;
    }
  }
  return `arco/${base}-wt-${stamp}`;
}

/**
 * Add a worktree at `worktreePath` for `branch`.
 * - Existing free branch → check it out there
 * - Branch already checked out elsewhere → new derived branch from that tip
 * - Branch missing → create it from HEAD
 */
export async function gitWorktreeAdd(
  worktreePath: string,
  branch: string,
): Promise<{ ok: true; path: string; branch: string }> {
  assertLocalGit();
  const abs = path.resolve(worktreePath.replace(/^~(?=\/|$)/, process.env.HOME ?? "~"));
  const br = branch.trim();
  if (!br) throw new Error("branch is required");

  await fs.mkdir(path.dirname(abs), { recursive: true });

  let checkedOut = br;
  try {
    await git(["worktree", "add", abs, br]);
  } catch (err) {
    const msg = gitErrMessage(err);
    if (/already checked out|already used by worktree/i.test(msg)) {
      // Same branch can't live in two worktrees — derive a new branch from it.
      checkedOut = await uniqueWorktreeBranch(br);
      await git(["worktree", "add", "-b", checkedOut, abs, br]);
    } else if (
      /invalid reference|not a valid branch|unknown revision|did not match any/i.test(msg)
    ) {
      await git(["worktree", "add", "-b", br, abs]);
      checkedOut = br;
    } else {
      throw new Error(msg || "Worktree add failed");
    }
  }
  workspaceStore.setWorktreePath(abs);
  return { ok: true, path: abs, branch: checkedOut };
}

export async function gitWorktreeRemove(worktreePath: string): Promise<{ ok: true }> {
  assertLocalGit();
  const abs = path.resolve(worktreePath);
  await git(["worktree", "remove", "--force", abs]);
  const state = workspaceStore.get();
  if (state.worktreePath && path.resolve(state.worktreePath) === abs) {
    workspaceStore.setWorktreePath(null);
  }
  return { ok: true };
}
