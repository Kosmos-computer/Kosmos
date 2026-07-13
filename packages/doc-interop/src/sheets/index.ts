import type { ExportResult, ImportResult, SheetFormat, WorkbookDoc } from "../types.js";
import { exportCsv, exportTsv, importCsv, importTsv } from "./delimited.js";
import { exportOds, importOds } from "./ods.js";
import { exportXlsx, importXlsx } from "./xlsx.js";

export async function importSheet(bytes: Uint8Array, format: SheetFormat): Promise<ImportResult<WorkbookDoc>> {
  switch (format) {
    case "json":
      return { content: JSON.parse(new TextDecoder().decode(bytes)) as WorkbookDoc, warnings: [], assets: [] };
    case "csv":
      return importCsv(new TextDecoder().decode(bytes));
    case "tsv":
      return importTsv(new TextDecoder().decode(bytes));
    case "ods":
      return importOds(bytes);
    case "xlsx":
      return importXlsx(bytes);
    default:
      throw new Error(`Unsupported sheet format: ${format as string}`);
  }
}

export async function exportSheet(content: WorkbookDoc, format: SheetFormat): Promise<ExportResult> {
  switch (format) {
    case "json":
      return {
        bytes: new TextEncoder().encode(JSON.stringify(content, null, 2)),
        mimeType: "application/json",
        filenameExt: "json",
        warnings: [],
      };
    case "csv":
      return exportCsv(content);
    case "tsv":
      return exportTsv(content);
    case "ods":
      return exportOds(content);
    case "xlsx":
      return exportXlsx(content);
    default:
      throw new Error(`Unsupported sheet format: ${format as string}`);
  }
}
