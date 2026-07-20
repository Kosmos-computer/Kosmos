/**
 * Per-turn workspace root override — isolates concurrent agent turns that
 * belong to different projects. Without this, background sessions share the
 * UI's active primary root via getPrimaryRoot().
 *
 * Tagged sessions (session.projectId set) bind tools/exec to that project's
 * path for the duration of the turn. Untagged sessions keep the normal
 * active-workspace behavior.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import { dataDirs } from "../env.js";
import { projectStore } from "./projectStore.js";

interface TurnWorkspace {
  projectId: string | null;
  root: string;
}

const storage = new AsyncLocalStorage<TurnWorkspace>();

/** Absolute root for the current async turn, if one was bound. */
export function getTurnWorkspaceRoot(): string | null {
  return storage.getStore()?.root ?? null;
}

export function getTurnProjectId(): string | null | undefined {
  return storage.getStore()?.projectId;
}

/** Resolve a project id to an on-disk root; unknown/missing → sandbox. */
export function resolveRootForProject(projectId: string | null): string {
  if (!projectId) return dataDirs.workspace;
  const project = projectStore.list().projects.find((p) => p.id === projectId);
  if (project && fs.existsSync(project.path)) return project.path;
  return dataDirs.workspace;
}

/**
 * Run `fn` with getPrimaryRoot()/getActiveRoot() preferring this session's
 * project root when `projectId` is set. When `projectId` is null/undefined,
 * do not install an override (UI active workspace wins).
 */
export async function withSessionWorkspace<T>(
  projectId: string | null | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  if (projectId == null) return fn();
  const root = resolveRootForProject(projectId);
  return storage.run({ projectId, root }, fn);
}
