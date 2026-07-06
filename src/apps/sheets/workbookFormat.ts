import type { Workbook } from "./types";

export interface StoredWorkbook extends Workbook {
  version?: number;
}

export function parseWorkbookContent(raw: string, fallbackTitle: string): Workbook {
  const parsed = JSON.parse(raw) as StoredWorkbook;
  return {
    id: parsed.id ?? "local",
    title: parsed.title ?? fallbackTitle,
    starred: parsed.starred,
    meta: parsed.meta,
    shared: parsed.shared,
    owner: parsed.owner,
    sheets: Array.isArray(parsed.sheets)
      ? parsed.sheets.map((sheet, index) => ({
          id: sheet.id ?? `sheet-${index + 1}`,
          name: sheet.name ?? `Sheet${index + 1}`,
          cells: sheet.cells ?? {},
        }))
      : [{ id: "sheet-1", name: "Sheet1", cells: {} }],
  };
}

export function serializeWorkbook(workbook: Workbook): string {
  return JSON.stringify({ version: 1, ...workbook }, null, 2);
}

export function workbookFromFile(fileId: string, name: string, raw: string): Workbook {
  const title = name.replace(/\.(sheet\.json|xlsx?)$/i, "") || "Untitled spreadsheet";
  const workbook = parseWorkbookContent(raw, title);
  return { ...workbook, id: fileId, title: workbook.title || title };
}
