import JSZip from "jszip";
import type { DocNode, ExportResult, ImportResult } from "../types.js";
import { importHtml } from "./html.js";

function textOf(node: DocNode): string {
  if (node.text) return node.text;
  return (node.content ?? []).map(textOf).join("");
}

function odtParagraph(innerXml: string, style?: string): string {
  const styleAttr = style ? ` text:style-name="${style}"` : "";
  return `<text:p${styleAttr}>${innerXml}</text:p>`;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inlineToOdt(node: DocNode): string {
  if (node.type === "text") {
    let text = escapeXml(node.text ?? "");
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") text = `<text:span text:style-name="Bold">${text}</text:span>`;
      if (mark.type === "italic") text = `<text:span text:style-name="Italic">${text}</text:span>`;
      if (mark.type === "link") {
        text = `<text:a xlink:href="${escapeXml(String(mark.attrs?.href ?? ""))}">${text}</text:a>`;
      }
    }
    return text;
  }
  if (node.type === "hardBreak") return "<text:line-break/>";
  return (node.content ?? []).map(inlineToOdt).join("");
}

function nodeToOdt(node: DocNode): string {
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map(nodeToOdt).join("");
    case "paragraph":
      return odtParagraph((node.content ?? []).map(inlineToOdt).join(""));
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level) || 1));
      return `<text:h text:style-name="Heading_20_${level}" text:outline-level="${level}">${(node.content ?? []).map(inlineToOdt).join("")}</text:h>`;
    }
    case "bulletList":
    case "orderedList": {
      const listStyle = node.type === "bulletList" ? "L1" : "L2";
      const items = (node.content ?? [])
        .map((item) => `<text:list-item>${(item.content ?? []).map(nodeToOdt).join("")}</text:list-item>`)
        .join("");
      return `<text:list text:style-name="${listStyle}">${items}</text:list>`;
    }
    case "blockquote":
      return (node.content ?? []).map((c) => odtParagraph(inlineToOdt(c), "Quote")).join("");
    case "codeBlock":
      return odtParagraph(escapeXml(textOf(node)), "Code");
    case "horizontalRule":
      return odtParagraph("―");
    case "table": {
      const rows = (node.content ?? [])
        .map((row) => {
          const cells = (row.content ?? [])
            .map((cell) => `<table:table-cell office:value-type="string">${(cell.content ?? []).map(nodeToOdt).join("")}</table:table-cell>`)
            .join("");
          return `<table:table-row>${cells}</table:table-row>`;
        })
        .join("");
      return `<table:table>${rows}</table:table>`;
    }
    default:
      return (node.content ?? []).map(nodeToOdt).join("");
  }
}

function stripNs(xml: string): string {
  return xml.replace(/<\/?[a-z0-9]+:/gi, (m) => m.replace(/[a-z0-9]+:/i, ""));
}

function odtXmlToHtml(contentXml: string): string {
  let html = stripNs(contentXml);
  html = html
    .replace(/<h\b[^>]*outline-level="(\d)"[^>]*>([\s\S]*?)<\/h>/gi, (_m, level, inner) => `<h${level}>${inner}</h${level}>`)
    .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, "<p>$1</p>")
    .replace(/<list\b[^>]*>/gi, "<ul>")
    .replace(/<\/list>/gi, "</ul>")
    .replace(/<list-item\b[^>]*>/gi, "<li>")
    .replace(/<\/list-item>/gi, "</li>")
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '<a href="$1">$2</a>')
    .replace(/<span\b[^>]*style-name="Bold"[^>]*>([\s\S]*?)<\/span>/gi, "<strong>$1</strong>")
    .replace(/<span\b[^>]*style-name="Italic"[^>]*>([\s\S]*?)<\/span>/gi, "<em>$1</em>")
    .replace(/<line-break\s*\/>/gi, "<br/>")
    .replace(/<table\b[^>]*>/gi, "<table>")
    .replace(/<\/table>/gi, "</table>")
    .replace(/<table-row\b[^>]*>/gi, "<tr>")
    .replace(/<\/table-row>/gi, "</tr>")
    .replace(/<table-cell\b[^>]*>/gi, "<td>")
    .replace(/<\/table-cell>/gi, "</td>")
    .replace(/<[^>]+>/g, (tag) => {
      if (/^<\/?(?:p|h[1-6]|ul|ol|li|a|strong|em|br|table|tr|td|th)\b/i.test(tag)) return tag;
      return "";
    });
  return html;
}

export async function importOdt(bytes: Uint8Array): Promise<ImportResult<DocNode>> {
  const zip = await JSZip.loadAsync(bytes);
  const contentXml = await zip.file("content.xml")?.async("string");
  if (!contentXml) {
    return { content: { type: "doc", content: [{ type: "paragraph" }] }, warnings: ["ODT missing content.xml"], assets: [] };
  }
  const html = odtXmlToHtml(contentXml);
  const imported = importHtml(html);
  return {
    ...imported,
    sourcePackageBase64: Buffer.from(bytes).toString("base64"),
    warnings: [...imported.warnings, "ODT import preserves the Arco Docs surface; complex ODF styles may be dropped."],
  };
}

export async function exportOdt(doc: DocNode): Promise<ExportResult> {
  const body = nodeToOdt(doc);
  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  office:version="1.3">
  <office:body><office:text>${body}</office:text></office:body>
</office:document-content>`;
  const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" office:version="1.3">
  <office:meta></office:meta>
</office:document-meta>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" office:version="1.3">
  <office:styles></office:styles>
</office:document-styles>`;
  const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;
  const zip = new JSZip();
  zip.file("mimetype", "application/vnd.oasis.opendocument.text", { compression: "STORE" });
  zip.file("content.xml", contentXml);
  zip.file("styles.xml", stylesXml);
  zip.file("meta.xml", metaXml);
  zip.folder("META-INF")?.file("manifest.xml", manifestXml);
  const bytes = await zip.generateAsync({ type: "uint8array", mimeType: "application/vnd.oasis.opendocument.text" });
  return {
    bytes,
    mimeType: "application/vnd.oasis.opendocument.text",
    filenameExt: "odt",
    warnings: [],
  };
}
