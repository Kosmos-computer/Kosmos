/**
 * Project registry — recent folders the user has opened. The active Studio
 * workspace (multi-root) lives in workspaceStore; this registry backs the
 * picker history and session.projectId bindings.
 *
 * activeId === null means the built-in sandbox is the implied Local primary.
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
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(state, null, 2));
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
