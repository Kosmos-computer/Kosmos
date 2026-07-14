export type {
  DeckDoc,
  DocFormat,
  DocNode,
  ExportResult,
  ImportResult,
  InteropAsset,
  SheetFormat,
  Slide,
  SlideBox,
  SlideShapeKind,
  SlidesFormat,
  WorkbookDoc,
} from "./types.js";
export { EMPTY_DECK } from "./types.js";
export { exportDoc, importDoc } from "./docs/index.js";
export { exportSheet, importSheet } from "./sheets/index.js";
export { exportSlides, importSlides } from "./slides/index.js";

/** Detect format from filename extension. */
export function detectDocFormat(name: string): import("./types.js").DocFormat | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".odt")) return "odt";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown";
  if (lower.endsWith(".json") || lower.endsWith(".doc.json")) return "json";
  return null;
}

export function detectSheetFormat(name: string): import("./types.js").SheetFormat | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".xlsx")) return "xlsx";
  if (lower.endsWith(".ods")) return "ods";
  if (lower.endsWith(".tsv")) return "tsv";
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".json") || lower.endsWith(".sheet.json")) return "json";
  return null;
}

export function detectSlidesFormat(name: string): import("./types.js").SlidesFormat | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pptx")) return "pptx";
  if (lower.endsWith(".odp")) return "odp";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  if (lower.endsWith(".json") || lower.endsWith(".slides.json")) return "json";
  return null;
}
