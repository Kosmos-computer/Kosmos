import type { DocBlock, NoteNavPage, NoteNavSection, NotePage } from "./types";

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

/** Sidebar tree — folders nest pages; drag to reorder or drop into folders. */
export const NOTES_NAV_SECTIONS: NoteNavSection[] = [
  {
    id: "ideas",
    title: "Ideas",
    items: [{ type: "page", id: "writing-telepathy", label: "Writing is telepathy", meta: "now" }],
  },
  {
    id: "recents",
    title: "Recents",
    items: [
      { type: "page", id: "p1", label: "Picnic Planning Notes", meta: "2h" },
      { type: "page", id: "p2", label: "06-26-2026 Community Forum", meta: "1d" },
    ],
  },
  {
    id: "private",
    title: "Private",
    items: [
      { type: "page", id: "p4", label: "Getting Started" },
      { type: "page", id: "p5", label: "1:1 notes" },
      {
        type: "folder",
        id: "folder-drafts",
        label: "Drafts",
        expanded: true,
        children: [{ type: "page", id: "p6", label: "Scratchpad" }],
      },
    ],
  },
  {
    id: "teamspaces",
    title: "Teamspaces",
    items: [
      {
        type: "folder",
        id: "folder-handbook",
        label: "Company Handbook",
        expanded: true,
        children: [{ type: "page", id: "p7", label: "Handbook" }],
      },
      {
        type: "folder",
        id: "folder-wiki",
        label: "Volunteer Team Wiki",
        expanded: false,
        children: [{ type: "page", id: "p8", label: "Wiki home" }],
      },
    ],
  },
];

export const DEFAULT_NAV_SECTION_ID = "private";

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

function stubPage(id: string, title: string, folder?: string, links?: string[], blocks?: DocBlock[]): NotePage {
  return {
    id,
    title,
    folder,
    links,
    blocks: blocks ?? [{ id: `${id}-empty`, type: "paragraph", text: "Start writing…" }],
  };
}

/** Seed vault — replaced at runtime by useNotesStub state. */
export const NOTES_VAULT_SEED: NotePage[] = [
  {
    id: "writing-telepathy",
    title: "Writing is telepathy",
    tags: ["evergreen"],
    folder: "ideas",
    links: ["evergreen-notes", "books"],
    blocks: WRITING_TELEPATHY_BLOCKS,
  },
  stubPage("evergreen-notes", "Evergreen notes", "references", ["writing-telepathy", "books"], [
    {
      id: "en-p1",
      type: "paragraph",
      text: "Evergreen notes are written and refined over time. They should be densely linked — start from Writing is telepathy as an example.",
    },
    { id: "en-h1", type: "heading", level: 2, text: "Properties" },
    {
      id: "en-list",
      type: "bulletList",
      items: [
        "Atomic — one idea per note.",
        "Concept-oriented — titles name ideas, not meetings.",
        "Densely linked — wikilinks to related notes.",
      ],
    },
  ]),
  stubPage("books", "Books", "references", ["evergreen-notes"], [
    { id: "bk-h1", type: "heading", level: 2, text: "Currently reading" },
    {
      id: "bk-list",
      type: "bulletList",
      items: ["On Writing — Stephen King", "How to Take Smart Notes — Sönke Ahrens"],
    },
  ]),
  stubPage("picnic-planning", "Picnic Planning Notes", "projects", ["community-forum", "vendor-layout"], [
    {
      id: "pp-p1",
      type: "paragraph",
      text: "Open questions for the summer picnic:",
    },
    {
      id: "pp-list",
      type: "bulletList",
      items: [
        "Rain backup location — community center vs. school gym.",
        "Food stations — one line or two parallel lines.",
        "Kids area — face painting or craft table.",
      ],
    },
  ]),
  stubPage("community-forum", "06-26-2026 Community Forum", "projects", ["picnic-planning", "company-handbook"], [
    { id: "cf-h1", type: "heading", level: 2, text: "Agenda" },
    {
      id: "cf-list",
      type: "bulletList",
      items: [
        "Neighborhood welcome session",
        "Vendor layout walkthrough",
        "Link to Company Handbook for volunteer onboarding",
      ],
    },
  ]),
  stubPage("vendor-layout", "Vendor Layout Study", "projects", ["community-forum", "scratchpad"], [
    {
      id: "vl-p1",
      type: "paragraph",
      text: "Compare booth and signage layouts for the summer picnic. Scratchpad has rough sketches.",
    },
  ]),
  stubPage("getting-started", "Getting Started", "private", ["evergreen-notes", "company-handbook"], [
    {
      id: "gs-p1",
      type: "paragraph",
      text: "Welcome to the vault. Start with Evergreen notes, then browse the graph to see how ideas connect.",
    },
  ]),
  stubPage("one-on-one", "1:1 notes", "private", ["community-forum"], [
    {
      id: "oo-p1",
      type: "paragraph",
      text: "Standing topics for coordinator sync. Event prep tracked in Community Forum notes.",
    },
  ]),
  stubPage("scratchpad", "Scratchpad", "private", ["vendor-layout"], [
    {
      id: "sc-p1",
      type: "paragraph",
      text: "Unstructured capture. Promote durable ideas into evergreen notes when ready.",
    },
  ]),
  stubPage("company-handbook", "Company Handbook", "teamspaces", ["getting-started", "volunteer-wiki"], [
    {
      id: "ch-p1",
      type: "paragraph",
      text: "Policies and culture doc. Onboarding path starts at Getting Started.",
    },
  ]),
  stubPage("volunteer-wiki", "Volunteer Team Wiki", "teamspaces", ["company-handbook", "vendor-layout"], [
    {
      id: "vw-p1",
      type: "paragraph",
      text: "Shared notes for event volunteers. See Vendor Layout Study for booth planning.",
    },
  ]),
];

export const DEFAULT_NOTE_ID = "writing-telepathy";
