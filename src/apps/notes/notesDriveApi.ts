import type { FileCreateInput, FileEntry } from "@shared/capabilities/files";
import { DOC_MIME, FOLDER_MIME } from "@shared/capabilities/files";
import { EMPTY_DOC_JSON } from "@shared/capabilities/docs";
import type { JSONContent } from "@arco/editor-kit";
import { blocksToDoc } from "./noteDocConvert";
import {
  NOTES_FOLDER_NAME,
  WELCOME_NOTE_TITLE,
  welcomeNoteBlocks,
} from "./notesMock";
import type { NoteNavFolderNode, NoteNavNode, NoteNavSection, NotePage } from "./types";
import type { NotesVaultEndpoint } from "./notesVaultTarget";
import { YOUR_NOTES_SECTION_ID } from "./notesMock";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `${res.status} ${res.statusText}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }
  return res.json() as Promise<T>;
}

function resolveUrl(endpoint: NotesVaultEndpoint, path: string): string {
  if (endpoint.baseUrl) return `${endpoint.baseUrl}${path}`;
  if (endpoint.forceLocalOrigin && typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return path;
}

async function vaultFetch<T>(
  endpoint: NotesVaultEndpoint,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (endpoint.bearerToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${endpoint.bearerToken}`);
  }
  const res = await fetch(resolveUrl(endpoint, path), {
    ...init,
    headers,
    credentials: "include",
  });
  return parseJson<T>(res);
}

export function noteTitleFromFileName(name: string): string {
  return name.replace(/\.doc\.json$/i, "").trim() || "Untitled";
}

export function noteFileNameFromTitle(title: string): string {
  const base = title.trim() || "Untitled";
  return base.toLowerCase().endsWith(".doc.json") ? base : `${base}.doc.json`;
}

function formatUpdatedMeta(updatedAt: string): string {
  const then = new Date(updatedAt).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.floor((Date.now() - then) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export async function listVaultEntries(
  endpoint: NotesVaultEndpoint,
  parentId: string | null,
): Promise<FileEntry[]> {
  const qs = new URLSearchParams();
  qs.set("parentId", parentId ?? "null");
  return vaultFetch<FileEntry[]>(endpoint, `/api/drive/entries?${qs}`);
}

export async function ensureNotesRoot(endpoint: NotesVaultEndpoint): Promise<FileEntry> {
  const rootEntries = await listVaultEntries(endpoint, null);
  const existing = rootEntries.find(
    (entry) =>
      !entry.trashed &&
      entry.mimeType === FOLDER_MIME &&
      entry.name === NOTES_FOLDER_NAME,
  );
  if (existing) return existing;

  return vaultFetch<FileEntry>(endpoint, "/api/drive/entries", {
    method: "POST",
    body: JSON.stringify({
      name: NOTES_FOLDER_NAME,
      kind: "folder",
      parentId: null,
    } satisfies FileCreateInput),
  });
}

export async function readNoteDoc(
  endpoint: NotesVaultEndpoint,
  id: string,
): Promise<JSONContent> {
  const payload = await vaultFetch<{ content: string }>(
    endpoint,
    `/api/drive/content/${encodeURIComponent(id)}`,
  );
  try {
    const parsed = JSON.parse(payload.content) as JSONContent;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // fall through
  }
  return structuredClone(EMPTY_DOC_JSON) as unknown as JSONContent;
}

export async function writeNoteDoc(
  endpoint: NotesVaultEndpoint,
  id: string,
  doc: JSONContent,
): Promise<FileEntry> {
  return vaultFetch<FileEntry>(endpoint, `/api/drive/content/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ content: JSON.stringify(doc) }),
  });
}

export async function createNoteFile(
  endpoint: NotesVaultEndpoint,
  parentId: string,
  title: string,
  doc?: JSONContent,
): Promise<FileEntry> {
  const content = JSON.stringify(doc ?? EMPTY_DOC_JSON);
  return vaultFetch<FileEntry>(endpoint, "/api/drive/entries", {
    method: "POST",
    body: JSON.stringify({
      name: noteFileNameFromTitle(title),
      kind: "file",
      mimeType: DOC_MIME,
      parentId,
      content,
    } satisfies FileCreateInput),
  });
}

export async function createNoteFolder(
  endpoint: NotesVaultEndpoint,
  parentId: string,
  name: string,
): Promise<FileEntry> {
  return vaultFetch<FileEntry>(endpoint, "/api/drive/entries", {
    method: "POST",
    body: JSON.stringify({
      name: name.trim() || "Untitled folder",
      kind: "folder",
      parentId,
    } satisfies FileCreateInput),
  });
}

export async function renameDriveEntry(
  endpoint: NotesVaultEndpoint,
  id: string,
  name: string,
): Promise<FileEntry> {
  return vaultFetch<FileEntry>(endpoint, `/api/drive/entries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function moveDriveEntry(
  endpoint: NotesVaultEndpoint,
  id: string,
  parentId: string | null,
): Promise<FileEntry> {
  return vaultFetch<FileEntry>(endpoint, `/api/drive/entries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ parentId }),
  });
}

export async function trashDriveEntry(
  endpoint: NotesVaultEndpoint,
  id: string,
): Promise<FileEntry> {
  return vaultFetch<FileEntry>(
    endpoint,
    `/api/drive/entries/${encodeURIComponent(id)}/trash`,
    { method: "POST" },
  );
}

async function buildNavNodes(
  endpoint: NotesVaultEndpoint,
  parentId: string,
  expandedIds: Set<string>,
): Promise<NoteNavNode[]> {
  const entries = (await listVaultEntries(endpoint, parentId))
    .filter((entry) => !entry.trashed)
    .sort((a, b) => {
      const aFolder = a.mimeType === FOLDER_MIME ? 0 : 1;
      const bFolder = b.mimeType === FOLDER_MIME ? 0 : 1;
      if (aFolder !== bFolder) return aFolder - bFolder;
      return a.name.localeCompare(b.name);
    });

  const nodes: NoteNavNode[] = [];
  for (const entry of entries) {
    if (entry.mimeType === FOLDER_MIME) {
      const expanded = expandedIds.has(entry.id);
      const children = expanded
        ? await buildNavNodes(endpoint, entry.id, expandedIds)
        : [];
      nodes.push({
        type: "folder",
        id: entry.id,
        label: entry.name,
        expanded,
        children,
      } satisfies NoteNavFolderNode);
      continue;
    }
    if (entry.mimeType !== DOC_MIME) continue;
    nodes.push({
      type: "page",
      id: entry.id,
      label: noteTitleFromFileName(entry.name),
      meta: formatUpdatedMeta(entry.updatedAt),
    });
  }
  return nodes;
}

export interface LoadedNotesVault {
  rootFolderId: string;
  librarySection: NoteNavSection;
  notes: NotePage[];
  recentEntries: FileEntry[];
  expandedFolderIds: string[];
}

async function collectDocEntries(
  endpoint: NotesVaultEndpoint,
  parentId: string,
): Promise<FileEntry[]> {
  const entries = (await listVaultEntries(endpoint, parentId)).filter((entry) => !entry.trashed);
  const docs: FileEntry[] = [];
  for (const entry of entries) {
    if (entry.mimeType === DOC_MIME) docs.push(entry);
    if (entry.mimeType === FOLDER_MIME) {
      docs.push(...(await collectDocEntries(endpoint, entry.id)));
    }
  }
  return docs;
}

export async function seedWelcomeNote(
  endpoint: NotesVaultEndpoint,
  rootFolderId: string,
): Promise<FileEntry> {
  const doc = blocksToDoc(welcomeNoteBlocks());
  return createNoteFile(endpoint, rootFolderId, WELCOME_NOTE_TITLE, doc);
}

export async function loadNotesVault(
  endpoint: NotesVaultEndpoint,
  expandedFolderIds: string[] = [],
): Promise<LoadedNotesVault> {
  const root = await ensureNotesRoot(endpoint);
  let children = await listVaultEntries(endpoint, root.id);
  const hasDocs = children.some(
    (entry) => !entry.trashed && (entry.mimeType === DOC_MIME || entry.mimeType === FOLDER_MIME),
  );
  if (!hasDocs) {
    await seedWelcomeNote(endpoint, root.id);
    children = await listVaultEntries(endpoint, root.id);
  }

  const expandedIds = new Set(expandedFolderIds);
  // First visit: expand top-level folders so nested pages are visible.
  if (expandedFolderIds.length === 0) {
    for (const entry of children) {
      if (entry.mimeType === FOLDER_MIME) expandedIds.add(entry.id);
    }
  }

  const items = await buildNavNodes(endpoint, root.id, expandedIds);
  const docEntries = await collectDocEntries(endpoint, root.id);
  const notes: NotePage[] = await Promise.all(
    docEntries.map(async (entry) => ({
      id: entry.id,
      title: noteTitleFromFileName(entry.name),
      folder: entry.parentId ?? root.id,
      doc: await readNoteDoc(endpoint, entry.id),
    })),
  );

  const recentEntries = [...docEntries].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return {
    rootFolderId: root.id,
    librarySection: {
      id: YOUR_NOTES_SECTION_ID,
      title: "Your Notes",
      allowCreate: true,
      allowDrag: true,
      items,
    },
    notes,
    recentEntries,
    expandedFolderIds: [...expandedIds],
  };
}

export function librarySectionWithExpanded(
  section: NoteNavSection,
  folderId: string,
  expanded: boolean,
): NoteNavSection {
  function mapNodes(nodes: NoteNavNode[]): NoteNavNode[] {
    return nodes.map((node) => {
      if (node.type === "page") return node;
      if (node.id === folderId) return { ...node, expanded };
      return { ...node, children: mapNodes(node.children) };
    });
  }
  return { ...section, items: mapNodes(section.items) };
}
