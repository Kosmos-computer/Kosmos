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
  "sheets.query": "read",
  "sheets.write_range": "write",
  "sheets.export": "read",
  "sheets.import": "write",
} as const;

export type SheetsIntentId = keyof typeof SHEETS_INTENTS;

export const SHEET_EXPORT_FORMATS = ["json", "csv", "tsv", "ods", "xlsx"] as const;

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
  "sheets.query": {
    type: "object",
    required: ["id", "range"],
    properties: {
      id: { type: "string", description: "Workbook file id" },
      sheet: { type: "string", description: "Sheet name or id; defaults to first sheet" },
      range: {
        type: "string",
        description: "A1 range, e.g. A1:C10 or A1",
      },
    },
  },
  "sheets.write_range": {
    type: "object",
    required: ["id", "values"],
    properties: {
      id: { type: "string" },
      sheet: { type: "string" },
      start: { type: "string", description: "Top-left A1 address", default: "A1" },
      values: {
        type: "array",
        description: "2D array of cell values (rows → columns)",
        items: { type: "array", items: {} },
      },
    },
  },
  "sheets.export": {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
      format: { type: "string", enum: [...SHEET_EXPORT_FORMATS], default: "json" },
    },
  },
  "sheets.import": {
    type: "object",
    required: ["name", "format", "contentBase64"],
    properties: {
      name: { type: "string" },
      parentId: { type: ["string", "null"] },
      format: { type: "string", enum: ["csv", "tsv", "ods", "xlsx", "json"] },
      contentBase64: { type: "string" },
      retainSource: { type: "boolean", default: true },
    },
  },
};

export { SHEET_MIME };
