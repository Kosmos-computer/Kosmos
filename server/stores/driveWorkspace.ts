/**
 * Drive-backed Studio workspace helpers — resolve name-based paths under
 * attached Drive folder roots and map list/read/write onto filesService.
 */
import type { WorkspaceEntry } from "../../shared/types.js";
import { filesService } from "../services/filesService.js";
import { listWorkspaceRoots, workspaceStore } from "./workspaceStore.js";

const FOLDER_MIME = "inode/directory";

function primaryDriveFolderId(): string {
  const primary = listWorkspaceRoots().find((r) => r.role === "primary");
  if (!primary) throw new Error("No Drive folder is open in the workspace");
  return primary.location;
}

/** Resolve a workspace-relative path to a Drive entry id (folder or file). */
export function resolveDriveEntryId(relPath: string): string {
  const cleaned = relPath.replace(/^\/+/, "").replace(/^\.$/, "");
  const roots = listWorkspaceRoots();
  if (!cleaned || cleaned === ".") return primaryDriveFolderId();

  const parts = cleaned.split("/").filter(Boolean);
  // rootName/... for additional Drive roots
  if (parts.length >= 1) {
    const named = roots.find((r) => r.name === parts[0]);
    if (named && (roots.length > 1 || parts.length > 1)) {
      let id = named.location;
      for (const segment of parts.slice(1)) {
        id = childByName(id, segment);
      }
      return id;
    }
  }

  let id = primaryDriveFolderId();
  for (const segment of parts) {
    id = childByName(id, segment);
  }
  return id;
}

function childByName(parentId: string, name: string): string {
  const children = filesService.list({ parentId });
  const hit = children.find((c) => c.name === name && !c.trashed);
  if (!hit) throw new Error(`Drive path not found: ${name}`);
  return hit.id;
}

export function listDriveWorkspace(relPath = "."): WorkspaceEntry[] {
  const state = workspaceStore.get();
  if (state.backend !== "drive") throw new Error("Workspace backend is not Drive");

  // Virtual multi-root listing at "."
  if ((!relPath || relPath === ".") && state.roots.length > 1) {
    return state.roots.map((r) => ({
      name: r.name,
      path: r.name,
      type: "dir" as const,
      size: 0,
      modifiedAt: new Date().toISOString(),
    }));
  }

  const folderId = resolveDriveEntryId(relPath || ".");
  const entry = filesService.get(folderId);
  if (entry.mimeType !== FOLDER_MIME) throw new Error("Not a folder");

  const prefix =
    !relPath || relPath === "."
      ? ""
      : relPath.replace(/\/+$/, "");

  return filesService.list({ parentId: folderId }).map((e) => ({
    name: e.name,
    path: prefix ? `${prefix}/${e.name}` : e.name,
    type: e.mimeType === FOLDER_MIME ? ("dir" as const) : ("file" as const),
    size: e.size,
    modifiedAt: e.updatedAt,
  }));
}

export function readDriveWorkspace(relPath: string): { path: string; content: string } {
  const id = resolveDriveEntryId(relPath);
  const content = filesService.readContent(id);
  return { path: relPath, content: content.content };
}

export function writeDriveWorkspace(relPath: string, content: string): { path: string; bytes: number } {
  const cleaned = relPath.replace(/^\/+/, "");
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length === 0) throw new Error("Cannot write the Drive root");

  const fileName = parts[parts.length - 1];
  const parentPath = parts.slice(0, -1).join("/") || ".";
  const parentId = resolveDriveEntryId(parentPath);

  const existing = filesService.list({ parentId }).find((e) => e.name === fileName);
  if (existing) {
    if (existing.mimeType === FOLDER_MIME) throw new Error("Cannot write a folder");
    filesService.writeContent(existing.id, content);
  } else {
    filesService.create({
      name: fileName,
      parentId,
      kind: "file",
      mimeType: "text/plain",
      content,
    });
  }
  return { path: relPath, bytes: Buffer.byteLength(content, "utf-8") };
}
