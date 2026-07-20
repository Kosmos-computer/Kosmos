import type { DocBlock, NoteNavSection, NotePage } from "./types";

/** Drive folder at vault root that holds Notes pages. */
export const NOTES_FOLDER_NAME = "Notes";

/** Mutable library section — folders and pages live here. */
export const YOUR_NOTES_SECTION_ID = "your-notes";

/** Derived section — recently opened notes, not a writable tree. */
export const RECENTS_SECTION_ID = "recents";

/** Local Arco vault — always available in the backend switcher. */
export const LOCAL_NOTES_BACKEND_ID = "local";

/** Prefix for vaults keyed by a saved server profile (Kosmos Cloud / remote). */
export const SERVER_NOTES_BACKEND_PREFIX = "server:";

export function notesBackendIdForServerProfile(profileId: string): string {
  return `${SERVER_NOTES_BACKEND_PREFIX}${profileId}`;
}

export function serverProfileIdFromNotesBackend(backendId: string): string | null {
  return backendId.startsWith(SERVER_NOTES_BACKEND_PREFIX)
    ? backendId.slice(SERVER_NOTES_BACKEND_PREFIX.length)
    : null;
}

export const DEFAULT_NAV_SECTION_ID = YOUR_NOTES_SECTION_ID;
export const WELCOME_NOTE_TITLE = "Welcome to Notes";

/** @deprecated Prefer Drive file ids from the loaded vault. */
export const DEFAULT_NOTE_ID = "welcome";

export function welcomeNoteBlocks(): DocBlock[] {
  return [
    {
      id: "w-p1",
      type: "paragraph",
      text: "Notes is your personal writing space in Arco. Capture ideas, draft docs, and keep everything in one vault.",
    },
    { id: "w-h1", type: "heading", level: 2, text: "What you can do" },
    {
      id: "w-list",
      type: "bulletList",
      items: [
        "Write with a rich editor — headings, lists, and callouts.",
        "Dictate or ask AI to help draft and revise.",
        "Switch between Edit, Preview, and Code views.",
        "Organize pages into folders under Your Notes.",
        "Open Recents to jump back to what you were last working on.",
        "Notes sync through Drive on this backend — Local and Kosmos Cloud keep separate vaults.",
      ],
    },
    { id: "w-h2", type: "heading", level: 2, text: "Get started" },
    {
      id: "w-p2",
      type: "paragraph",
      text: "Edit this page, or create a new one from the sidebar. New pages land in Your Notes and show up in Recents when you open them.",
    },
    {
      id: "w-callout",
      type: "callout",
      text: "Tip: Use the footer to switch between Local and Kosmos Cloud. Each backend stores its own Notes folder in Drive.",
    },
  ];
}

/** Empty library shell used while a vault is loading. */
export const EMPTY_LIBRARY_SECTION: NoteNavSection = {
  id: YOUR_NOTES_SECTION_ID,
  title: "Your Notes",
  allowCreate: true,
  allowDrag: true,
  items: [],
};

export type { NotePage };
