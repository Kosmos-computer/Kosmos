import type { JSONContent } from "@arco/editor-kit";

export type DocBlock =
  | { id: string; type: "heading"; level: 1 | 2 | 3; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "bulletList"; items: string[] }
  | { id: string; type: "callout"; text: string };

export interface NotePage {
  id: string;
  title: string;
  tags?: string[];
  folder?: string;
  blocks?: DocBlock[];
  /** TipTap document — preferred at runtime after first edit. */
  doc?: JSONContent;
  /** Explicit outbound links to other note IDs. */
  links?: string[];
  backlinks?: number;
  wordCount?: number;
}

export interface NotesGraphNode {
  id: string;
  label: string;
  tags?: string[];
  connections: number;
  x: number;
  y: number;
}

export interface NotesGraphEdge {
  id: string;
  from: string;
  to: string;
}

export interface NoteNavPageNode {
  type: "page";
  id: string;
  label: string;
  meta?: string;
}

export interface NoteNavFolderNode {
  type: "folder";
  id: string;
  label: string;
  children: NoteNavNode[];
  expanded?: boolean;
}

export type NoteNavNode = NoteNavPageNode | NoteNavFolderNode;

export interface NoteNavSection {
  id: string;
  title: string;
  items: NoteNavNode[];
  /** When false, hide new page/folder actions (e.g. Recents). Default true. */
  allowCreate?: boolean;
  /** When false, rows are not draggable. Default true. */
  allowDrag?: boolean;
}

export type NoteEditorViewMode = "edit" | "preview" | "code";
