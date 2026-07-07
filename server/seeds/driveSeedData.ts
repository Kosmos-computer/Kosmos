/**
 * Idempotent Drive seed catalog — office-suite samples for first boot.
 * Checked by name (+ parent folder) so re-runs skip existing entries.
 */
import {
  DOC_MIME,
  SCHEDULE_MIME,
  SHEET_MIME,
  SLIDES_MIME,
  TASK_MIME,
} from "../../shared/capabilities/files.js";
import { EMPTY_DOC_JSON } from "../../shared/capabilities/docs.js";
import { EMPTY_SHEET_JSON } from "../../shared/capabilities/sheets.js";

export interface DriveSeedFolder {
  name: string;
  /** Path to parent folder, e.g. "Projects", or omit for root. */
  parent?: string;
}

export interface DriveSeedFile {
  name: string;
  mimeType: string;
  content: string;
  starred?: boolean;
  /** Path to containing folder, e.g. "Projects/Design", or omit for root. */
  folder?: string;
}

/** Root Music folder — surfaced by the Drive sidebar Music tab. */
export const MUSIC_FOLDER_NAME = "Music";

export const DRIVE_SEED_FOLDERS: DriveSeedFolder[] = [
  { name: MUSIC_FOLDER_NAME },
  { name: "Projects" },
  { name: "Shared" },
  { name: "Design", parent: "Projects" },
];

const Q2_BUDGET_WORKBOOK = {
  version: 1,
  title: "Q2 Budget Tracker",
  starred: true,
  sheets: [
    {
      id: "sheet-summary",
      name: "Summary",
      cells: {
        A1: { value: "Category", format: { bold: true, fill: "muted" } },
        B1: { value: "Budget", format: { bold: true, fill: "muted", align: "right" } },
        C1: { value: "Actual", format: { bold: true, fill: "muted", align: "right" } },
        D1: { value: "Variance", format: { bold: true, fill: "muted", align: "right" } },
        A2: { value: "Payroll" },
        B2: { value: 42000, format: { numberFormat: "currency" } },
        C2: { value: 41500, format: { numberFormat: "currency" } },
        D2: { value: 500, format: { numberFormat: "currency" } },
        A3: { value: "Cloud & Infra" },
        B3: { value: 8600, format: { numberFormat: "currency" } },
        C3: { value: 9120, format: { numberFormat: "currency" } },
        D3: { value: -520, format: { numberFormat: "currency" } },
        A4: { value: "Marketing" },
        B4: { value: 12000, format: { numberFormat: "currency" } },
        C4: { value: 10840, format: { numberFormat: "currency" } },
        D4: { value: 1160, format: { numberFormat: "currency" } },
        A8: { value: "Total", format: { bold: true, fill: "accent" } },
        B8: { value: 70300, format: { bold: true, numberFormat: "currency", fill: "accent" } },
        C8: { value: 70640, format: { bold: true, numberFormat: "currency", fill: "accent" } },
        D8: { value: -340, format: { bold: true, numberFormat: "currency", fill: "accent" } },
      },
    },
    {
      id: "sheet-expenses",
      name: "Expenses",
      cells: {
        A1: { value: "Date", format: { bold: true, fill: "muted" } },
        B1: { value: "Vendor", format: { bold: true, fill: "muted" } },
        C1: { value: "Amount", format: { bold: true, fill: "muted", align: "right" } },
        A2: { value: "2026-04-02" },
        B2: { value: "AWS" },
        C2: { value: 2840, format: { numberFormat: "currency" } },
        A3: { value: "2026-04-05" },
        B3: { value: "Linear" },
        C3: { value: 480, format: { numberFormat: "currency" } },
      },
    },
  ],
};

const PRODUCT_ROADMAP_DOC = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Product Roadmap" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Office suite milestone: Drive routes files to Docs, Sheets, Tasks, and Calendar. Agents read and write the same JSON the UI edits.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Q2 priorities" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Drive open-with routing for typed documents" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Sheets grid parity with UI Experiments reference" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Slides editor (custom canvas + editor-kit)" }],
            },
          ],
        },
      ],
    },
  ],
};

export const DRIVE_SEED_FILES: DriveSeedFile[] = [
  {
    name: "Q2 Budget Tracker.sheet.json",
    mimeType: SHEET_MIME,
    content: JSON.stringify(Q2_BUDGET_WORKBOOK, null, 2),
    starred: true,
  },
  {
    name: "Product Roadmap.doc.json",
    mimeType: DOC_MIME,
    content: JSON.stringify(PRODUCT_ROADMAP_DOC, null, 2),
    starred: true,
  },
  {
    name: "Team Standup Notes.doc.json",
    mimeType: DOC_MIME,
    content: JSON.stringify(
      {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Team Standup — Jul 6" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Alex: Sheets save path wired to Drive." }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Jordan: NavRail hover polish in review." }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Riley: Docs bundle builds cleanly on ui-enhancements." }],
          },
        ],
      },
      null,
      2,
    ),
  },
  {
    name: "Launch Deck.slides.json",
    mimeType: SLIDES_MIME,
    content: JSON.stringify(
      {
        version: 1,
        title: "Launch Deck",
        slides: [
          {
            id: "slide-1",
            title: "Arco OS",
            boxes: [{ id: "b1", type: "text", text: "The AI-native desktop" }],
          },
          {
            id: "slide-2",
            title: "Office suite",
            boxes: [{ id: "b2", type: "text", text: "Drive · Docs · Sheets · Slides" }],
          },
          {
            id: "slide-3",
            title: "Agent-native",
            boxes: [{ id: "b3", type: "text", text: "Every document is intent-addressable" }],
          },
        ],
      },
      null,
      2,
    ),
  },
  {
    name: "Sprint Tasks.task.json",
    mimeType: TASK_MIME,
    content: JSON.stringify(
      {
        version: 1,
        title: "Sprint Tasks",
        tasks: [
          { id: "t1", title: "Drive New dropdown", done: true },
          { id: "t2", title: "Sheets inline editing", done: true },
          { id: "t3", title: "Seed sample Drive files", done: true },
          { id: "t4", title: "Slides editor v1", done: false },
        ],
      },
      null,
      2,
    ),
  },
  {
    name: "Weekly Schedule.schedule.json",
    mimeType: SCHEDULE_MIME,
    content: JSON.stringify(
      {
        version: 1,
        title: "Weekly Schedule",
        events: [
          { id: "e1", title: "Team standup", day: "Mon", start: "09:00", end: "09:30" },
          { id: "e2", title: "Design review", day: "Wed", start: "14:00", end: "15:00" },
          { id: "e3", title: "Sprint planning", day: "Fri", start: "10:00", end: "11:30" },
        ],
      },
      null,
      2,
    ),
  },
  {
    name: "Welcome.md",
    mimeType: "text/markdown",
    content: `# Welcome to Arco Drive

This is your OS file store (\`os.files@1\`). Files here are visible to every app and to the agent.

## Try it

- Open **Q2 Budget Tracker** in Sheets
- Open **Product Roadmap** in Docs
- Use **New** to create more typed documents
`,
  },
  {
    name: "API Design.doc.json",
    mimeType: DOC_MIME,
    folder: "Projects",
    content: JSON.stringify(
      {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "API Design Notes" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Intents are the grant boundary: files.list, docs.open, sheets.open, calendar.event.create.",
              },
            ],
          },
        ],
      },
      null,
      2,
    ),
  },
  {
    name: "Component Audit.md",
    mimeType: "text/markdown",
    folder: "Projects/Design",
    content: `# Component Audit

- [x] Menu dropdown primitive
- [x] NavSidebar primarySlot
- [ ] Slides canvas boxes
`,
  },
  {
    name: "Team OKRs.sheet.json",
    mimeType: SHEET_MIME,
    folder: "Shared",
    content: JSON.stringify(
      {
        version: 1,
        title: "Team OKRs",
        sheets: [
          {
            id: "sheet-okrs",
            name: "OKRs",
            cells: {
              A1: { value: "Objective", format: { bold: true, fill: "muted" } },
              B1: { value: "Key result", format: { bold: true, fill: "muted" } },
              C1: { value: "Progress", format: { bold: true, fill: "muted", align: "right" } },
              A2: { value: "Ship AI OS shell" },
              B2: { value: "Launch 12 workspaces" },
              C2: { value: 0.75, format: { numberFormat: "percent" } },
              A3: { value: "Grow design system" },
              B3: { value: "Cover 40 primitives" },
              C3: { value: 0.62, format: { numberFormat: "percent" } },
            },
          },
        ],
      },
      null,
      2,
    ),
    starred: true,
  },
  {
    name: "Empty doc.doc.json",
    mimeType: DOC_MIME,
    folder: "Projects",
    content: JSON.stringify(EMPTY_DOC_JSON, null, 2),
  },
  {
    name: "Blank spreadsheet.sheet.json",
    mimeType: SHEET_MIME,
    folder: "Projects",
    content: JSON.stringify(EMPTY_SHEET_JSON, null, 2),
  },
];
