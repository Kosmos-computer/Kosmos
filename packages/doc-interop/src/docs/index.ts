import type { DocFormat, DocNode, ExportResult, ImportResult } from "../types.js";
import { exportDocx, importDocx } from "./docx.js";
import { exportHtml, importHtml } from "./html.js";
import { exportMarkdown, importMarkdown } from "./markdown.js";
import { exportOdt, importOdt } from "./odt.js";

export async function importDoc(bytes: Uint8Array, format: DocFormat): Promise<ImportResult<DocNode>> {
  switch (format) {
    case "json": {
      const text = new TextDecoder().decode(bytes);
      return { content: JSON.parse(text) as DocNode, warnings: [], assets: [] };
    }
    case "markdown":
      return importMarkdown(new TextDecoder().decode(bytes));
    case "html":
      return importHtml(new TextDecoder().decode(bytes));
    case "odt":
      return importOdt(bytes);
    case "docx":
      return importDocx(bytes);
    default:
      throw new Error(`Unsupported doc format: ${format as string}`);
  }
}

export async function exportDoc(content: DocNode, format: DocFormat): Promise<ExportResult> {
  switch (format) {
    case "json":
      return {
        bytes: new TextEncoder().encode(JSON.stringify(content, null, 2)),
        mimeType: "application/json",
        filenameExt: "json",
        warnings: [],
      };
    case "markdown":
      return exportMarkdown(content);
    case "html":
      return exportHtml(content);
    case "odt":
      return exportOdt(content);
    case "docx":
      return exportDocx(content);
    default:
      throw new Error(`Unsupported doc format: ${format as string}`);
  }
}
