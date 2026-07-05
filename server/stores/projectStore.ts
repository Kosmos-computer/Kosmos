/**
 * Project registry — the "Open Folder" concept. A project is any directory
 * on disk the user has opened; the active project becomes the root for all
 * agent file tools, exec commands, and the /api/files browser.
 *
 * activeId === null means the built-in sandbox (data/workspace) is active —
 * the safe default that preserves Arco's original behavior.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Project } from "../../shared/types.js";
import { dataDirs } from "../env.js";

const PROJECTS_FILE = path.join(dataDirs.root, "projects.json");

interface ProjectsState {
  projects: Project[];
  activeId: string | null;
}

function load(): ProjectsState {
  try {
    const raw = fs.readFileSync(PROJECTS_FILE, "utf-8");
    return JSON.parse(raw) as ProjectsState;
  } catch {
    return { projects: [], activeId: null };
  }
}

function save(state: ProjectsState): void {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export const projectStore = {
  list(): ProjectsState {
    return load();
  },

  /**
   * Register a directory as a project (idempotent on path) and make it
   * active. Throws if the path isn't an existing directory.
   */
  add(dirPath: string): Project {
    const abs = path.resolve(dirPath.replace(/^~(?=\/|$)/, process.env.HOME ?? "~"));
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
      throw new Error(`Not a directory: ${abs}`);
    }
    const state = load();
    const existing = state.projects.find((p) => p.path === abs);
    if (existing) {
      state.activeId = existing.id;
      save(state);
      return existing;
    }
    const project: Project = {
      id: crypto.randomUUID(),
      name: path.basename(abs),
      path: abs,
      addedAt: new Date().toISOString(),
    };
    state.projects.push(project);
    state.activeId = project.id;
    save(state);
    return project;
  },

  remove(id: string): void {
    const state = load();
    state.projects = state.projects.filter((p) => p.id !== id);
    if (state.activeId === id) state.activeId = null;
    save(state);
  },

  /** null switches back to the sandbox workspace. */
  setActive(id: string | null): void {
    const state = load();
    if (id !== null && !state.projects.some((p) => p.id === id)) {
      throw new Error(`Unknown project: ${id}`);
    }
    state.activeId = id;
    save(state);
  },

  getActive(): Project | null {
    const state = load();
    return state.projects.find((p) => p.id === state.activeId) ?? null;
  },
};

// ---------------------------------------------------------------------------
// Active-root path resolution
//
// These replace env.ts's sandbox-only resolveWorkspacePath: same containment
// guarantee (no escaping via ".."), but rooted at whichever folder is open.
// ---------------------------------------------------------------------------

/** Absolute root all agent file/exec operations resolve against. */
export function getActiveRoot(): string {
  const active = projectStore.getActive();
  // A project deleted from disk falls back to the sandbox instead of erroring
  // on every tool call.
  if (active && fs.existsSync(active.path)) return active.path;
  return dataDirs.workspace;
}

/** Resolve a root-relative path, refusing escapes above the active root. */
export function resolveProjectPath(p: string): string {
  const root = getActiveRoot();
  const cleaned = p.replace(/^~\//, "").replace(/^\/+/, "");
  const abs = path.resolve(root, cleaned);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error(`Path escapes the project root: ${p}`);
  }
  return abs;
}
