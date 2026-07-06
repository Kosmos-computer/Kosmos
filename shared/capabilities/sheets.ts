/**
 * os.sheets@1 — thin spreadsheet contract over os.files@1.
 *
 * Workbooks live in the file store as JSON (application/x-os-sheet+json).
 */
import { SHEET_MIME } from "./files.js";

export const SHEETS_CONTRACT_ID = "os.sheets@1";

/** Default empty workbook — one sheet named "Sheet1". */
export const EMPTY_SHEET_JSON = {
  version: 1,
  title: "Untitled spreadsheet",
  sheets: [
    {
      id: "sheet-1",
      name: "Sheet1",
      cells: {},
    },
  ],
} as const;

export const SHEETS_INTENTS = {
  "sheets.create": "write",
  "sheets.open": "read",
} as const;

export type SheetsIntentId = keyof typeof SHEETS_INTENTS;

export const SHEETS_INTENT_SCHEMAS: Record<string, Record<string, unknown>> = {
  "sheets.create": {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", description: "File name, e.g. Budget.sheet.json" },
      parentId: { type: ["string", "null"], description: "Folder id, or null for root" },
      content: {
        type: "object",
        description: "Workbook JSON; defaults to an empty workbook",
      },
    },
  },
  "sheets.open": {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", description: "File id in the OS store" } },
  },
};

export { SHEET_MIME };
