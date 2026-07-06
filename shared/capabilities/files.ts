/**
 * os.files@1 — the OS-owned virtual file store.
 *
 * The foundation of the office suite (Drive, Docs, Sheets, Slides) and the
 * notes clone: documents live HERE as typed JSON files, not inside any
 * app's private storage. That is what makes editor apps swappable, lets
 * apps share documents, and makes every document agent-readable/writable
 * through the same permissioned intents.
 *
 * Distinct from the agent's project workspace (/api/files, raw disk paths):
 * this store is a metadata+content database with ids, trash, and events —
 * user documents, not source trees.
 *
 * Deliberately minimal (list/search/CRUD/content); the surface grows when a
 * second consumer demands it. First-draft contracts are always wrong.
 */

export const FILES_CONTRACT_ID = "os.files@1";

/** Folders carry this mime type; every other entry is a regular file. */
export const FOLDER_MIME = "inode/directory";

/**
 * Typed-document mime conventions — the join key between files and the
 * editor apps that register for them. Reserved now so document formats are
 * stable before any editor ships.
 */
export const DOC_MIME = "application/x-os-doc+json";
export const SHEET_MIME = "application/x-os-sheet+json";
export const SLIDES_MIME = "application/x-os-slides+json";

export interface FileEntry {
  id: string;
  name: string;
  /** Parent folder id, or null at the root. */
  parentId: string | null;
  mimeType: string;
  /** Content bytes (0 for folders). */
  size: number;
  starred: boolean;
  trashed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FileCreateInput {
  name: string;
  parentId?: string | null;
  /** Omit (or pass FOLDER_MIME) plus kind:"folder" to create a folder. */
  kind: "file" | "folder";
  mimeType?: string;
  /** Initial text content for files. */
  content?: string;
}

/** Intent ids and their access class — the grant/audit units of the contract. */
export const FILES_INTENTS = {
  "files.list": "read",
  "files.get": "read",
  "files.search": "read",
  "files.create": "write",
  "files.rename": "write",
  "files.move": "write",
  "files.star": "write",
  "files.trash": "write",
  "files.restore": "write",
  "files.delete": "write",
  "files.content.read": "read",
  "files.content.write": "write",
} as const;

export type FilesIntentId = keyof typeof FILES_INTENTS;

/** Event topic announced on every mutation (create/update/move/trash/…). */
export const FILES_CHANGED_TOPIC = "files.changed";

/**
 * JSON Schemas per intent — the machine-readable face of the contract,
 * consumed wherever an intent is exposed as a callable tool.
 */
export const FILES_INTENT_SCHEMAS: Record<FilesIntentId, Record<string, unknown>> = {
  "files.list": {
    type: "object",
    properties: {
      parentId: {
        type: ["string", "null"],
        description: "Folder to list; null/omitted = root",
      },
      trashed: { type: "boolean", description: "true lists the trash instead" },
      starred: { type: "boolean", description: "true lists starred entries everywhere" },
    },
  },
  "files.get": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  "files.search": {
    type: "object",
    properties: { query: { type: "string", description: "Case-insensitive name substring" } },
    required: ["query"],
  },
  "files.create": {
    type: "object",
    properties: {
      name: { type: "string" },
      parentId: { type: ["string", "null"], description: "Destination folder; null = root" },
      kind: { type: "string", enum: ["file", "folder"] },
      mimeType: { type: "string", description: "Defaults to text/plain for files" },
      content: { type: "string", description: "Initial text content (files only)" },
    },
    required: ["name", "kind"],
  },
  "files.rename": {
    type: "object",
    properties: { id: { type: "string" }, name: { type: "string" } },
    required: ["id", "name"],
  },
  "files.move": {
    type: "object",
    properties: {
      id: { type: "string" },
      parentId: { type: ["string", "null"], description: "New parent folder; null = root" },
    },
    required: ["id"],
  },
  "files.star": {
    type: "object",
    properties: { id: { type: "string" }, starred: { type: "boolean" } },
    required: ["id", "starred"],
  },
  "files.trash": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  "files.restore": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  "files.delete": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  "files.content.read": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  "files.content.write": {
    type: "object",
    properties: {
      id: { type: "string" },
      content: { type: "string", description: "Full replacement text content" },
    },
    required: ["id", "content"],
  },
};
