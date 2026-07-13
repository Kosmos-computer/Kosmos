import type { DeckDoc, ExportResult, ImportResult, SlidesFormat } from "../types.js";
import { exportSlidesHtml, importSlidesHtml } from "./html.js";
import { exportOdp, importOdp } from "./odp.js";
import { exportPdf, exportPptx, importPptx } from "./pptx.js";

export async function importSlides(bytes: Uint8Array, format: SlidesFormat): Promise<ImportResult<DeckDoc>> {
  switch (format) {
    case "json":
      return { content: JSON.parse(new TextDecoder().decode(bytes)) as DeckDoc, warnings: [], assets: [] };
    case "html":
      return importSlidesHtml(new TextDecoder().decode(bytes));
    case "odp":
      return importOdp(bytes);
    case "pptx":
      return importPptx(bytes);
    case "pdf":
      return {
        content: {
          version: 1,
          title: "Imported",
          width: 960,
          height: 540,
          slides: [{ id: "slide-1", boxes: [] }],
        },
        warnings: ["PDF import is not supported; created an empty deck."],
        assets: [],
      };
    default:
      throw new Error(`Unsupported slides format: ${format as string}`);
  }
}

export async function exportSlides(content: DeckDoc, format: SlidesFormat): Promise<ExportResult> {
  switch (format) {
    case "json":
      return {
        bytes: new TextEncoder().encode(JSON.stringify(content, null, 2)),
        mimeType: "application/json",
        filenameExt: "json",
        warnings: [],
      };
    case "html":
      return exportSlidesHtml(content);
    case "odp":
      return exportOdp(content);
    case "pptx":
      return exportPptx(content);
    case "pdf":
      return exportPdf(content);
    default:
      throw new Error(`Unsupported slides format: ${format as string}`);
  }
}
