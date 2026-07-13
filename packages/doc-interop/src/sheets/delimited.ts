import type { ExportResult, ImportResult, SheetCell, WorkbookDoc } from "../types.js";

function columnLabel(index: number): string {
  let label = "";
  let value = index;
  while (value >= 0) {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  }
  return label;
}

function parseDelimited(text: string, delimiter: string): ImportResult<WorkbookDoc> {
  const rows = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const cells: Record<string, SheetCell> = {};
  rows.forEach((row, r) => {
    if (!row && r === rows.length - 1) return;
    const parts = row.split(delimiter);
    parts.forEach((part, c) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      const num = Number(trimmed);
      cells[`${columnLabel(c)}${r + 1}`] = {
        value: Number.isFinite(num) && trimmed !== "" ? num : trimmed,
      };
    });
  });
  return {
    content: {
      version: 1,
      title: "Imported",
      sheets: [{ id: "sheet-1", name: "Sheet1", cells }],
    },
    warnings: [],
    assets: [],
  };
}

function exportDelimited(workbook: WorkbookDoc, delimiter: string): ExportResult {
  const sheet = workbook.sheets[0] ?? { cells: {} as Record<string, SheetCell> };
  const addresses = Object.keys(sheet.cells);
  let maxRow = 0;
  let maxCol = 0;
  for (const addr of addresses) {
    const m = addr.match(/^([A-Z]+)(\d+)$/);
    if (!m) continue;
    const col = m[1].split("").reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
    const row = Number(m[2]) - 1;
    maxCol = Math.max(maxCol, col);
    maxRow = Math.max(maxRow, row);
  }
  const lines: string[] = [];
  for (let r = 0; r <= maxRow; r++) {
    const cols: string[] = [];
    for (let c = 0; c <= maxCol; c++) {
      const cell = sheet.cells[`${columnLabel(c)}${r + 1}`];
      const raw = cell?.formula ?? cell?.value ?? "";
      cols.push(String(raw));
    }
    lines.push(cols.join(delimiter));
  }
  const text = lines.join("\n");
  return {
    bytes: new TextEncoder().encode(text),
    mimeType: delimiter === "\t" ? "text/tab-separated-values" : "text/csv",
    filenameExt: delimiter === "\t" ? "tsv" : "csv",
    warnings: workbook.sheets.length > 1 ? ["CSV/TSV export includes only the first sheet."] : [],
  };
}

export function importCsv(text: string): ImportResult<WorkbookDoc> {
  return parseDelimited(text, ",");
}

export function importTsv(text: string): ImportResult<WorkbookDoc> {
  return parseDelimited(text, "\t");
}

export function exportCsv(workbook: WorkbookDoc): ExportResult {
  return exportDelimited(workbook, ",");
}

export function exportTsv(workbook: WorkbookDoc): ExportResult {
  return exportDelimited(workbook, "\t");
}

export { columnLabel };
