import ExcelJS from "exceljs";
import type { ExportResult, ImportResult, SheetCell, WorkbookDoc } from "../types.js";
import { columnLabel } from "./delimited.js";

export async function importXlsx(bytes: Uint8Array): Promise<ImportResult<WorkbookDoc>> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheets = workbook.worksheets.map((ws, index) => {
    const cells: Record<string, SheetCell> = {};
    ws.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        const addr = `${columnLabel(colNumber - 1)}${rowNumber}`;
        const formula = typeof cell.formula === "string" ? `=${cell.formula}` : undefined;
        const value =
          typeof cell.value === "number" || typeof cell.value === "string"
            ? cell.value
            : cell.text || undefined;
        cells[addr] = {
          ...(formula ? { formula } : {}),
          ...(value !== undefined && !formula ? { value } : formula ? { value: cell.result as string | number } : {}),
          format: {
            bold: Boolean(cell.font?.bold),
            italic: Boolean(cell.font?.italic),
            strikethrough: Boolean(cell.font?.strike),
          },
        };
      });
    });
    return {
      id: `sheet-${index + 1}`,
      name: ws.name || `Sheet${index + 1}`,
      cells,
    };
  });
  return {
    content: { version: 1, title: workbook.title || "Imported", sheets },
    warnings: ["XLSX import maps values, basic formulas, and bold/italic/strike into the Arco sheet surface."],
    assets: [],
    sourcePackageBase64: Buffer.from(bytes).toString("base64"),
  };
}

export async function exportXlsx(doc: WorkbookDoc): Promise<ExportResult> {
  const workbook = new ExcelJS.Workbook();
  workbook.title = doc.title ?? "Workbook";
  for (const sheet of doc.sheets) {
    const ws = workbook.addWorksheet(sheet.name);
    for (const [addr, cell] of Object.entries(sheet.cells)) {
      const excelCell = ws.getCell(addr);
      if (cell.formula?.startsWith("=")) {
        excelCell.value = { formula: cell.formula.slice(1), result: cell.value as string | number | undefined };
      } else if (cell.value !== undefined) {
        excelCell.value = cell.value;
      }
      if (cell.format?.bold || cell.format?.italic || cell.format?.strikethrough) {
        excelCell.font = {
          bold: cell.format.bold,
          italic: cell.format.italic,
          strike: cell.format.strikethrough,
        };
      }
      if (cell.format?.align) {
        excelCell.alignment = { horizontal: cell.format.align };
      }
    }
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return {
    bytes: new Uint8Array(buffer as ArrayBuffer),
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filenameExt: "xlsx",
    warnings: [],
  };
}
