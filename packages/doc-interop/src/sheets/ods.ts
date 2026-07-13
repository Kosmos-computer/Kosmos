import JSZip from "jszip";
import type { ExportResult, ImportResult, SheetCell, WorkbookDoc } from "../types.js";
import { columnLabel } from "./delimited.js";

function cellRefToAddr(col: number, row: number): string {
  return `${columnLabel(col)}${row + 1}`;
}

export async function importOds(bytes: Uint8Array): Promise<ImportResult<WorkbookDoc>> {
  const zip = await JSZip.loadAsync(bytes);
  const contentXml = await zip.file("content.xml")?.async("string");
  if (!contentXml) {
    return {
      content: { version: 1, sheets: [{ id: "sheet-1", name: "Sheet1", cells: {} }] },
      warnings: ["ODS missing content.xml"],
      assets: [],
    };
  }
  const sheets: WorkbookDoc["sheets"] = [];
  const tableRe = /<table:table\b[^>]*table:name="([^"]*)"[^>]*>([\s\S]*?)<\/table:table>/gi;
  let tableMatch: RegExpExecArray | null;
  let sheetIndex = 0;
  while ((tableMatch = tableRe.exec(contentXml)) !== null) {
    const name = tableMatch[1] || `Sheet${sheetIndex + 1}`;
    const body = tableMatch[2];
    const cells: Record<string, SheetCell> = {};
    const rows = [...body.matchAll(/<table:table-row\b[^>]*>([\s\S]*?)<\/table:table-row>/gi)];
    rows.forEach((rowMatch, r) => {
      const cellMatches = [...rowMatch[1].matchAll(/<table:table-cell\b([^>]*)>([\s\S]*?)<\/table:table-cell>|<table:table-cell\b([^/]*)\/>/gi)];
      let c = 0;
      for (const cellMatch of cellMatches) {
        const attrs = cellMatch[1] ?? cellMatch[3] ?? "";
        const inner = cellMatch[2] ?? "";
        const repeat = Number(attrs.match(/table:number-columns-repeated="(\d+)"/)?.[1] ?? 1);
        const formula = attrs.match(/table:formula="of:=([^"]*)"/)?.[1];
        const value =
          attrs.match(/office:value="([^"]*)"/)?.[1] ??
          inner.match(/<text:p[^>]*>([\s\S]*?)<\/text:p>/)?.[1]?.replace(/<[^>]+>/g, "");
        for (let i = 0; i < repeat; i++) {
          if (formula || value) {
            cells[cellRefToAddr(c, r)] = {
              ...(formula ? { formula: `=${formula}` } : {}),
              ...(value !== undefined ? { value: Number.isFinite(Number(value)) ? Number(value) : value } : {}),
            };
          }
          c += 1;
        }
      }
    });
    sheets.push({ id: `sheet-${sheetIndex + 1}`, name, cells });
    sheetIndex += 1;
  }
  if (sheets.length === 0) {
    sheets.push({ id: "sheet-1", name: "Sheet1", cells: {} });
  }
  return {
    content: { version: 1, title: "Imported", sheets },
    warnings: ["ODS import maps cell values and of:= formulas into the Arco sheet surface."],
    assets: [],
    sourcePackageBase64: Buffer.from(bytes).toString("base64"),
  };
}

export async function exportOds(doc: WorkbookDoc): Promise<ExportResult> {
  const tables = doc.sheets
    .map((sheet) => {
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
      const rows: string[] = [];
      for (let r = 0; r <= Math.max(maxRow, 0); r++) {
        const cells: string[] = [];
        for (let c = 0; c <= Math.max(maxCol, 0); c++) {
          const cell = sheet.cells[cellRefToAddr(c, r)];
          if (!cell) {
            cells.push(`<table:table-cell/>`);
            continue;
          }
          if (cell.formula?.startsWith("=")) {
            cells.push(
              `<table:table-cell table:formula="of:=${cell.formula.slice(1)}" office:value-type="string"><text:p>${cell.value ?? ""}</text:p></table:table-cell>`,
            );
          } else if (typeof cell.value === "number") {
            cells.push(
              `<table:table-cell office:value-type="float" office:value="${cell.value}"><text:p>${cell.value}</text:p></table:table-cell>`,
            );
          } else {
            cells.push(
              `<table:table-cell office:value-type="string"><text:p>${String(cell.value ?? "")}</text:p></table:table-cell>`,
            );
          }
        }
        rows.push(`<table:table-row>${cells.join("")}</table:table-row>`);
      }
      return `<table:table table:name="${sheet.name}">${rows.join("")}</table:table>`;
    })
    .join("");

  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  office:version="1.3">
  <office:body><office:spreadsheet>${tables}</office:spreadsheet></office:body>
</office:document-content>`;
  const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.spreadsheet"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;
  const zip = new JSZip();
  zip.file("mimetype", "application/vnd.oasis.opendocument.spreadsheet", { compression: "STORE" });
  zip.file("content.xml", contentXml);
  zip.folder("META-INF")?.file("manifest.xml", manifestXml);
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return {
    bytes,
    mimeType: "application/vnd.oasis.opendocument.spreadsheet",
    filenameExt: "ods",
    warnings: [],
  };
}
