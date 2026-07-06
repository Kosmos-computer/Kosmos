import type { DocBlock, NoteNavPage, NotePage } from "./types";

export const IDEAS_PAGES: NoteNavPage[] = [
  { id: "writing-telepathy", label: "Writing is telepathy", meta: "now", icon: "notebook" },
];

export const RECENT_PAGES: NoteNavPage[] = [
  { id: "p1", label: "Picnic Planning Notes", meta: "2h", icon: "notebook" },
  { id: "p2", label: "06-26-2026 Community Forum", meta: "1d", icon: "notebook" },
];

export const PRIVATE_PAGES: NoteNavPage[] = [
  { id: "p4", label: "Getting Started", icon: "notebook" },
  { id: "p5", label: "1:1 notes", icon: "notebook" },
  { id: "p6", label: "Scratchpad", icon: "notebook" },
];

export const TEAMSPACE_PAGES: NoteNavPage[] = [
  { id: "p7", label: "Company Handbook", icon: "folder" },
  { id: "p8", label: "Volunteer Team Wiki", icon: "folder" },
];

const WRITING_TELEPATHY_BLOCKS: DocBlock[] = [
  {
    id: "wt-p1",
    type: "paragraph",
    text: "From On Writing — ideas can travel through time and space when we write.",
  },
  { id: "wt-h1", type: "heading", level: 2, text: "Ideas can travel through time and space" },
  {
    id: "wt-p2",
    type: "paragraph",
    text: "All the hours we spend in the sending place and the receiving place are compressed into a single moment. See also Evergreen notes for how to cultivate these durable ideas.",
  },
  {
    id: "wt-list",
    type: "bulletList",
    items: [
      "Writing collapses distance between author and reader.",
      "Links like this one turn notes into a web: Evergreen notes.",
      "Reading lists anchor the practice — see Books.",
    ],
  },
  { id: "wt-h2", type: "heading", level: 2, text: "Quote" },
  {
    id: "wt-callout",
    type: "callout",
    text: "Telepathy, of course. It's amusing when you stop to think about it — but still, pretty neat. Miscommunication only begins when the reader and writer fail to share enough context.",
  },
];

function stubPage(id: string, title: string, folder?: string): NotePage {
  return {
    id,
    title,
    folder,
    blocks: [{ id: `${id}-empty`, type: "paragraph", text: "Start writing…" }],
    backlinks: 0,
    wordCount: 0,
  };
}

/** STUB: replace with notes store / vault API when wired. */
export const NOTES_VAULT: NotePage[] = [
  {
    id: "writing-telepathy",
    title: "Writing is telepathy",
    tags: ["evergreen"],
    folder: "ideas",
    blocks: WRITING_TELEPATHY_BLOCKS,
    backlinks: 3,
    wordCount: 106,
  },
  stubPage("picnic-planning", "Picnic Planning Notes"),
  stubPage("community-forum", "06-26-2026 Community Forum"),
  stubPage("getting-started", "Getting Started", "private"),
  stubPage("one-on-one", "1:1 notes", "private"),
  stubPage("scratchpad", "Scratchpad", "private"),
  stubPage("company-handbook", "Company Handbook", "teamspaces"),
  stubPage("volunteer-wiki", "Volunteer Team Wiki", "teamspaces"),
];

export const DEFAULT_NOTE_ID = "writing-telepathy";
