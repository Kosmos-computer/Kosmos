import type { DocBlock, NoteNavSection, NotePage } from "./types";

/** Mutable library section — folders and pages live here. */
export const YOUR_NOTES_SECTION_ID = "your-notes";

/** Derived section — recently opened notes, not a writable tree. */
export const RECENTS_SECTION_ID = "recents";

/** Local Arco vault — always available in the backend switcher. */
export const LOCAL_NOTES_BACKEND_ID = "local";

export const DEFAULT_NAV_SECTION_ID = YOUR_NOTES_SECTION_ID;
export const DEFAULT_NOTE_ID = "welcome";

export interface NotesVaultSnapshot {
  vault: NotePage[];
  navSections: NoteNavSection[];
  activePageId: string;
}
const WELCOME_BLOCKS: DocBlock[] = [
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
      "Use the context canvas for graphs and linked views (coming soon).",
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
    text: "Tip: Use the + button in Your Notes to add a page, or the folder button to start grouping related notes.",
  },
];

/** Library tree seed — Recents is derived at runtime from open history. */
export const NOTES_LIBRARY_SECTION: NoteNavSection = {
  id: YOUR_NOTES_SECTION_ID,
  title: "Your Notes",
  allowCreate: true,
  allowDrag: true,
  items: [{ type: "page", id: DEFAULT_NOTE_ID, label: "Welcome to Notes" }],
};

/** Initial library nav state (Recents is composed at runtime). */
export const NOTES_NAV_SECTIONS: NoteNavSection[] = [NOTES_LIBRARY_SECTION];

/** Seed vault — replaced at runtime by useNotesStub state. */
export const NOTES_VAULT_SEED: NotePage[] = [
  {
    id: DEFAULT_NOTE_ID,
    title: "Welcome to Notes",
    folder: YOUR_NOTES_SECTION_ID,
    blocks: WELCOME_BLOCKS,
  },
];

export function createLocalVaultSnapshot(): NotesVaultSnapshot {
  return {
    vault: structuredClone(NOTES_VAULT_SEED),
    navSections: structuredClone(NOTES_NAV_SECTIONS),
    activePageId: DEFAULT_NOTE_ID,
  };
}

/** Stub vault for a connected remote backend — distinct content until a sync API exists. */
export function createRemoteVaultSnapshot(backend: {
  id: string;
  name: string;
}): NotesVaultSnapshot {
  const noteId = `welcome-${backend.id}`;
  const title = `Notes on ${backend.name}`;
  const blocks: DocBlock[] = [
    {
      id: `${noteId}-p1`,
      type: "paragraph",
      text: `This vault is scoped to ${backend.name}. Switching backends in the sidebar footer swaps the notes you see.`,
    },
    { id: `${noteId}-h1`, type: "heading", level: 2, text: "Remote vault" },
    {
      id: `${noteId}-list`,
      type: "bulletList",
      items: [
        "Each connected backend keeps its own pages and folders.",
        "Local notes stay on this machine.",
        "Sync and conflict handling will land with the vault API.",
      ],
    },
    {
      id: `${noteId}-callout`,
      type: "callout",
      text: `You're viewing stub content for ${backend.name}. Edits stay in this session until a real backend store is wired.`,
    },
  ];

  return {
    vault: [
      {
        id: noteId,
        title,
        folder: YOUR_NOTES_SECTION_ID,
        blocks,
      },
    ],
    navSections: [
      {
        id: YOUR_NOTES_SECTION_ID,
        title: "Your Notes",
        allowCreate: true,
        allowDrag: true,
        items: [{ type: "page", id: noteId, label: title }],
      },
    ],
    activePageId: noteId,
  };
}