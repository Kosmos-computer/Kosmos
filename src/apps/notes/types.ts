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

export interface NoteNavPage {
  id: string;
  label: string;
  meta?: string;
  icon?: "notebook" | "folder";
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
}

export const SIDEBAR_TO_NOTE_ID: Record<string, string> = {
  p1: "picnic-planning",
  p2: "community-forum",
  p3: "vendor-layout",
  p4: "getting-started",
  p5: "one-on-one",
  p6: "scratchpad",
  p7: "company-handbook",
  p8: "volunteer-wiki",
};

export function resolveNoteId(pageId: string): string {
  return SIDEBAR_TO_NOTE_ID[pageId] ?? pageId;
}

export type NoteEditorViewMode = "edit" | "preview" | "code";
