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
  blocks: DocBlock[];
  backlinks?: number;
  wordCount?: number;
}

export interface NoteNavPage {
  id: string;
  label: string;
  meta?: string;
  icon?: "notebook" | "folder";
}

export type NotesView = "editor" | "graph";

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
