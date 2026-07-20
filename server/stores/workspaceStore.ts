/**
 * Studio workspace state — multi-root coding workspace with Local / Drive /
 * Remote backend kinds. Persists separately from the recent-folders registry
 * (projects.json); migrates from projects.activeId on first load.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  WorkspaceBackendKind,
  WorkspaceRoot,
  WorkspaceState,
} from "../../shared/types.js";
import { dataDirs } from "../env.js";
import { projectStore } from "./projectStore.js";
import { getTurnWorkspaceRoot } from "./turnWorkspace.js";

const WORKSPACE_FILE = path.join(dataDirs.root, "workspace-state.json");

function sandboxState(): WorkspaceState {
  return {
    backend: "local",
    remoteProfileId: null,
    roots: [],
    worktreePath: null,
  };
}

function rootFromPath(dirPath: string, role: WorkspaceRoot["role"]): WorkspaceRoot {
  const abs = path.resolve(dirPath);
  return {
    id: crypto.randomUUID(),
    name: path.basename(abs) || abs,
    location: abs,
    role,
  };
}

function rootFromDrive(folderId: string, name: string, role: WorkspaceRoot["role"]): WorkspaceRoot {
  return {
    id: crypto.randomUUID(),
    name: name || folderId.slice(0, 8),
    location: folderId,
    role,
  };
}

function loadRaw(): WorkspaceState | null {
  try {
    const raw = fs.readFileSync(WORKSPACE_FILE, "utf-8");
    return JSON.parse(raw) as WorkspaceState;
  } catch {
    return null;
  }
}

function save(state: WorkspaceState): void {
  fs.mkdirSync(dataDirs.root, { recursive: true });
  fs.writeFileSync(WORKSPACE_FILE, JSON.stringify(state, null, 2));
}

/** First boot: mirror projects.activeId into a single-root Local workspace. */
function migrateFromProjects(): WorkspaceState {
  const projects = projectStore.list();
  const active = projects.projects.find((p) => p.id === projects.activeId);
  if (!active) return sandboxState();
  return {
    backend: "local",
    remoteProfileId: null,
    roots: [
      {
        id: active.id,
        name: active.name,
        location: active.path,
        role: "primary",
      },
    ],
    worktreePath: null,
  };
}

function load(): WorkspaceState {
  const existing = loadRaw();
  if (existing && Array.isArray(existing.roots)) {
    return {
      backend: existing.backend ?? "local",
      remoteProfileId: existing.remoteProfileId ?? null,
      roots: existing.roots,
      worktreePath: existing.worktreePath ?? null,
    };
  }
  const migrated = migrateFromProjects();
  save(migrated);
  return migrated;
}

function normalizeRoles(roots: WorkspaceRoot[]): WorkspaceRoot[] {
  if (roots.length === 0) return roots;
  let sawPrimary = false;
  return roots.map((r, i) => {
    if (r.role === "primary" && !sawPrimary) {
      sawPrimary = true;
      return r;
    }
    if (!sawPrimary && i === 0) {
      sawPrimary = true;
      return { ...r, role: "primary" };
    }
    return { ...r, role: "additional" };
  });
}

export const workspaceStore = {
  get(): WorkspaceState {
    return load();
  },

  /** Replace the full workspace document. */
  set(next: WorkspaceState): WorkspaceState {
    const state: WorkspaceState = {
      backend: next.backend,
      remoteProfileId: next.remoteProfileId ?? null,
      roots: normalizeRoles(next.roots ?? []),
      worktreePath: next.worktreePath ?? null,
    };
    if (state.backend !== "local") state.worktreePath = null;
    save(state);
    syncProjectsActive(state);
    return state;
  },

  setBackend(backend: WorkspaceBackendKind, remoteProfileId: string | null = null): WorkspaceState {
    const state = load();
    // Switching backend clears roots — locations are not portable across kinds.
    const next: WorkspaceState = {
      backend,
      remoteProfileId: backend === "remote" ? remoteProfileId : null,
      roots: [],
      worktreePath: null,
    };
    // Local ← keep nothing; Drive/Remote start empty until user picks folders.
    void state;
    save(next);
    syncProjectsActive(next);
    return next;
  },

  /** Open/replace primary root (Local path or Drive folder id + name). */
  setPrimary(location: string, name?: string): WorkspaceState {
    const state = load();
    const additional = state.roots.filter((r) => r.role === "additional");
    let primary: WorkspaceRoot;
    if (state.backend === "drive") {
      primary = rootFromDrive(location, name ?? location, "primary");
    } else {
      const abs = path.resolve(location.replace(/^~(?=\/|$)/, process.env.HOME ?? "~"));
      if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
        throw new Error(`Not a directory: ${abs}`);
      }
      primary = rootFromPath(abs, "primary");
      if (name) primary = { ...primary, name };
      // Register in recent-folders list.
      projectStore.add(abs);
    }
    const next: WorkspaceState = {
      ...state,
      roots: [primary, ...additional.map((r) => ({ ...r, role: "additional" as const }))],
      worktreePath: null,
    };
    save(next);
    syncProjectsActive(next);
    return next;
  },

  addRoot(location: string, name?: string): WorkspaceState {
    const state = load();
    let root: WorkspaceRoot;
    if (state.backend === "drive") {
      if (state.roots.some((r) => r.location === location)) {
        return state;
      }
      root = rootFromDrive(location, name ?? location, state.roots.length === 0 ? "primary" : "additional");
    } else {
      const abs = path.resolve(location.replace(/^~(?=\/|$)/, process.env.HOME ?? "~"));
      if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
        throw new Error(`Not a directory: ${abs}`);
      }
      if (state.roots.some((r) => r.location === abs)) {
        return state;
      }
      root = rootFromPath(abs, state.roots.length === 0 ? "primary" : "additional");
      if (name) root = { ...root, name };
      projectStore.add(abs);
    }
    const roots = [...state.roots, root];
    // add() above may have set projects.activeId to this path — restore primary.
    const next: WorkspaceState = {
      ...state,
      roots: normalizeRoles(roots),
      worktreePath: root.role === "primary" ? null : state.worktreePath,
    };
    save(next);
    syncProjectsActive(next);
    return next;
  },

  removeRoot(id: string): WorkspaceState {
    const state = load();
    const roots = state.roots.filter((r) => r.id !== id);
    const next: WorkspaceState = {
      ...state,
      roots: normalizeRoles(roots),
      worktreePath: null,
    };
    save(next);
    syncProjectsActive(next);
    return next;
  },

  setPrimaryId(id: string): WorkspaceState {
    const state = load();
    if (!state.roots.some((r) => r.id === id)) {
      throw new Error(`Unknown workspace root: ${id}`);
    }
    const next: WorkspaceState = {
      ...state,
      roots: state.roots.map((r) => ({
        ...r,
        role: r.id === id ? ("primary" as const) : ("additional" as const),
      })),
      worktreePath: null,
    };
    save(next);
    syncProjectsActive(next);
    return next;
  },

  setWorktreePath(worktreePath: string | null): WorkspaceState {
    const state = load();
    if (state.backend !== "local") {
      throw new Error("Worktrees are only available for Local workspaces");
    }
    if (worktreePath) {
      const abs = path.resolve(worktreePath);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
        throw new Error(`Not a directory: ${abs}`);
      }
      const next = { ...state, worktreePath: abs };
      save(next);
      return next;
    }
    const next = { ...state, worktreePath: null };
    save(next);
    return next;
  },

  /** Clear to sandbox (no user roots). */
  clearToSandbox(): WorkspaceState {
    const next = sandboxState();
    save(next);
    projectStore.setActive(null);
    return next;
  },
};

/**
 * Keep projects.activeId aligned with the Local primary root so legacy
 * ProjectPicker / session.projectId bindings stay coherent.
 */
function syncProjectsActive(state: WorkspaceState): void {
  if (state.backend !== "local") {
    projectStore.setActive(null);
    return;
  }
  const primary = state.roots.find((r) => r.role === "primary");
  if (!primary) {
    projectStore.setActive(null);
    return;
  }
  const projects = projectStore.list();
  const match = projects.projects.find((p) => p.path === primary.location);
  if (match) {
    projectStore.setActive(match.id);
  } else {
    // Ensure primary exists in the registry.
    const added = projectStore.add(primary.location);
    projectStore.setActive(added.id);
  }
}

/** Absolute cwd for exec/git/default relative paths (respects worktree). */
export function getPrimaryRoot(): string {
  // Concurrent turns bind a session's project root via withSessionWorkspace.
  const turnRoot = getTurnWorkspaceRoot();
  if (turnRoot) return turnRoot;

  const state = workspaceStore.get();
  if (state.backend === "drive") {
    // Drive has no POSIX cwd — fall back to sandbox for any accidental exec.
    return dataDirs.workspace;
  }
  if (state.worktreePath && fs.existsSync(state.worktreePath)) {
    return state.worktreePath;
  }
  const primary = state.roots.find((r) => r.role === "primary");
  if (primary && fs.existsSync(primary.location)) {
    return primary.location;
  }
  return dataDirs.workspace;
}

/** @deprecated Prefer getPrimaryRoot — alias for migration. */
export function getActiveRoot(): string {
  return getPrimaryRoot();
}

export function listWorkspaceRoots(): WorkspaceRoot[] {
  return workspaceStore.get().roots;
}

export function getWorkspaceBackend(): WorkspaceBackendKind {
  return workspaceStore.get().backend;
}

function isUnderRoot(abs: string, root: string): boolean {
  const r = path.resolve(root);
  return abs === r || abs.startsWith(r + path.sep);
}

/**
 * Resolve a workspace-relative path against multi-root Local workspace.
 * Supports `rootName/...` prefixes for additional roots.
 */
export function resolveProjectPath(p: string): string {
  const state = workspaceStore.get();
  if (state.backend === "drive") {
    throw new Error("Use Drive workspace APIs for Drive-backed paths");
  }

  const cleaned = p.replace(/^~\//, "").replace(/^\/+/, "");
  const primary = getPrimaryRoot();

  // Absolute path under any attached root (or worktree / primary).
  if (path.isAbsolute(p)) {
    const abs = path.resolve(p);
    const roots = effectiveDiskRoots(state);
    if (roots.some((r) => isUnderRoot(abs, r))) return abs;
    throw new Error(`Path escapes the workspace roots: ${p}`);
  }

  // rootName/rel — match attached root by name.
  const slash = cleaned.indexOf("/");
  const maybeName = slash === -1 ? cleaned : cleaned.slice(0, slash);
  const rest = slash === -1 ? "" : cleaned.slice(slash + 1);
  const named = state.roots.find((r) => r.name === maybeName);
  if (named && state.roots.length > 1) {
    const base =
      named.role === "primary" && state.worktreePath && fs.existsSync(state.worktreePath)
        ? state.worktreePath
        : named.location;
    const abs = rest ? path.resolve(base, rest) : path.resolve(base);
    if (!isUnderRoot(abs, base)) throw new Error(`Path escapes the project root: ${p}`);
    return abs;
  }

  const abs = path.resolve(primary, cleaned || ".");
  if (!isUnderRoot(abs, primary)) throw new Error(`Path escapes the project root: ${p}`);
  return abs;
}

/** Disk roots used for containment (primary effective path + additional). */
function effectiveDiskRoots(state: WorkspaceState): string[] {
  const out: string[] = [];
  for (const r of state.roots) {
    if (r.role === "primary" && state.worktreePath && fs.existsSync(state.worktreePath)) {
      out.push(state.worktreePath);
    } else {
      out.push(r.location);
    }
  }
  if (out.length === 0) out.push(dataDirs.workspace);
  return out;
}

/** Map an absolute path back to a workspace-relative display path. */
export function toWorkspaceRelative(absPath: string): string {
  const state = workspaceStore.get();
  const abs = path.resolve(absPath);
  const primary = getPrimaryRoot();
  if (isUnderRoot(abs, primary)) {
    const rel = path.relative(primary, abs);
    return rel || ".";
  }
  for (const r of state.roots) {
    const base =
      r.role === "primary" && state.worktreePath && fs.existsSync(state.worktreePath)
        ? state.worktreePath
        : r.location;
    if (isUnderRoot(abs, base)) {
      const rel = path.relative(base, abs);
      return rel ? `${r.name}/${rel}` : r.name;
    }
  }
  return abs;
}
