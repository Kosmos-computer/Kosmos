/**
 * One Plane issue, one Techno Studio session.
 *
 * Opening an issue again returns the session already bound to it. The
 * engine repo is attached when that folder is already a Studio project;
 * cloning it is a separate call so a list click cannot fill the disk.
 */
import fs from "node:fs";
import path from "node:path";
import type { Project, Session } from "../../shared/types.js";
import { cloneGitRepo } from "../gitClone.js";
import { projectStore } from "../stores/projectStore.js";
import { sessionStore } from "../stores/sessionStore.js";
import { workspaceStore } from "../stores/workspaceStore.js";
import { getPlaneIssue } from "./planeClient.js";
import { ENGINE_GIT_REF } from "./planeIssue.js";

function isEngineProject(project: Project): boolean {
  return project.name === "kosmos-engine" || path.basename(project.path) === "kosmos-engine";
}

/** The shallow clone, if someone has already opened it. */
export function findEngineProject(): Project | null {
  return projectStore.list().projects.find(isEngineProject) ?? null;
}

/**
 * Clone Modern-Telepathy/kosmos-engine (depth 1, via cloneGitRepo) when
 * it is not already registered. `token` is the caller's GitHub token for
 * the private repo.
 */
export async function ensureEngineProject(token?: string): Promise<Project> {
  // A local checkout (KOSMOS_ENGINE_DIR) is registered as-is. Cloning is the
  // path for a machine that does not already have the repo.
  const override = process.env.KOSMOS_ENGINE_DIR?.trim();
  if (override && fs.existsSync(override) && fs.statSync(override).isDirectory()) {
    const project = projectStore.add(override);
    workspaceStore.setBackend("local");
    workspaceStore.setPrimary(override);
    return project;
  }
  const existing = findEngineProject();
  if (existing) {
    projectStore.setActive(existing.id);
    workspaceStore.setBackend("local");
    workspaceStore.setPrimary(existing.path);
    return existing;
  }
  const dest = await cloneGitRepo(ENGINE_GIT_REF, undefined, token);
  const project = projectStore.add(dest);
  workspaceStore.setBackend("local");
  workspaceStore.setPrimary(dest);
  return project;
}

/**
 * Return the Studio session for this Plane issue, creating it on first open.
 * The title is the issue key plus name. The engine project is linked when present.
 */
export async function openPlaneSession(issueId: string): Promise<Session> {
  const issue = await getPlaneIssue(issueId);
  const project = findEngineProject();
  const existing = await sessionStore.findByPlaneIssueId(issue.id);
  if (existing) {
    if (project && existing.projectId !== project.id) {
      existing.projectId = project.id;
      await sessionStore.save(existing);
    }
    if (project) {
      projectStore.setActive(project.id);
      workspaceStore.setBackend("local");
      workspaceStore.setPrimary(project.path);
    }
    return existing;
  }
  const title = `${issue.key}: ${issue.name}`.slice(0, 80);
  return sessionStore.create("chat", title, {
    projectId: project?.id ?? null,
    planeIssueId: issue.id,
    planeIssueKey: issue.key,
  });
}
