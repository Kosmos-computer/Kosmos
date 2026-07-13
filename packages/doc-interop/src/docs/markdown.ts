import {
  exportDocToMarkdown,
  importMarkdownToDoc,
  type DocNode as SharedDocNode,
} from "../../../../shared/docFormat.js";
import type { DocNode, ExportResult, ImportResult } from "../types.js";

export function importMarkdown(text: string): ImportResult<DocNode> {
  return {
    content: importMarkdownToDoc(text) as DocNode,
    warnings: [],
    assets: [],
  };
}

export function exportMarkdown(doc: DocNode): ExportResult {
  const md = exportDocToMarkdown(doc as SharedDocNode);
  return {
    bytes: new TextEncoder().encode(md),
    mimeType: "text/markdown",
    filenameExt: "md",
    warnings: [],
  };
}
