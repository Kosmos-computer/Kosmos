import JSZip from "jszip";
import type { DeckDoc, ExportResult, ImportResult, Slide, SlideBox } from "../types.js";
import { EMPTY_DECK } from "../types.js";

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function boxText(box: SlideBox): string {
  if (typeof box.content === "string") return box.content;
  if (box.content && typeof box.content === "object") {
    const walk = (n: { text?: string; content?: unknown[] }): string => {
      if (n.text) return n.text;
      return ((n.content as { text?: string; content?: unknown[] }[]) ?? []).map(walk).join("");
    };
    return walk(box.content);
  }
  return "";
}

export async function exportOdp(deck: DeckDoc): Promise<ExportResult> {
  const pages = deck.slides
    .map((slide, index) => {
      const frames = slide.boxes
        .map((box) => {
          const x = `${(box.x / deck.width) * 28}cm`;
          const y = `${(box.y / deck.height) * 15.75}cm`;
          const w = `${(box.w / deck.width) * 28}cm`;
          const h = `${(box.h / deck.height) * 15.75}cm`;
          const text = escapeXml(boxText(box));
          return `<draw:frame svg:x="${x}" svg:y="${y}" svg:width="${w}" svg:height="${h}" draw:name="${escapeXml(box.id)}">
  <draw:text-box><text:p>${text}</text:p></draw:text-box>
</draw:frame>`;
        })
        .join("\n");
      return `<draw:page draw:name="page${index + 1}" draw:style-name="dp1">${frames}</draw:page>`;
    })
    .join("\n");

  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  office:version="1.3">
  <office:body><office:presentation>${pages}</office:presentation></office:body>
</office:document-content>`;
  const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.presentation"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;
  const zip = new JSZip();
  zip.file("mimetype", "application/vnd.oasis.opendocument.presentation", { compression: "STORE" });
  zip.file("content.xml", contentXml);
  zip.folder("META-INF")?.file("manifest.xml", manifestXml);
  // Embed canonical Arco JSON for lossless re-import of the authoring surface.
  zip.file("arco-deck.json", JSON.stringify(deck));
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return {
    bytes,
    mimeType: "application/vnd.oasis.opendocument.presentation",
    filenameExt: "odp",
    warnings: [],
  };
}

export async function importOdp(bytes: Uint8Array): Promise<ImportResult<DeckDoc>> {
  const zip = await JSZip.loadAsync(bytes);
  const arcoJson = await zip.file("arco-deck.json")?.async("string");
  if (arcoJson) {
    try {
      return {
        content: JSON.parse(arcoJson) as DeckDoc,
        warnings: [],
        assets: [],
        sourcePackageBase64: Buffer.from(bytes).toString("base64"),
      };
    } catch {
      /* fall through */
    }
  }
  const contentXml = await zip.file("content.xml")?.async("string");
  if (!contentXml) {
    return { content: { ...EMPTY_DECK }, warnings: ["ODP missing content.xml"], assets: [] };
  }
  const slides: Slide[] = [];
  const pageRe = /<draw:page\b[^>]*>([\s\S]*?)<\/draw:page>/gi;
  let pageMatch: RegExpExecArray | null;
  let i = 0;
  while ((pageMatch = pageRe.exec(contentXml)) !== null) {
    const boxes: SlideBox[] = [];
    const frameRe = /<draw:frame\b([^>]*)>([\s\S]*?)<\/draw:frame>/gi;
    let frameMatch: RegExpExecArray | null;
    let bi = 0;
    while ((frameMatch = frameRe.exec(pageMatch[1])) !== null) {
      const attrs = frameMatch[1];
      const inner = frameMatch[2];
      const text = inner.match(/<text:p[^>]*>([\s\S]*?)<\/text:p>/)?.[1]?.replace(/<[^>]+>/g, "") ?? "";
      boxes.push({
        id: attrs.match(/draw:name="([^"]*)"/)?.[1] ?? `box-${bi + 1}`,
        kind: "text",
        x: 40 + bi * 20,
        y: 40 + bi * 20,
        w: 400,
        h: 80,
        content: {
          type: "doc",
          content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }],
        },
      });
      bi += 1;
    }
    slides.push({ id: `slide-${i + 1}`, boxes });
    i += 1;
  }
  return {
    content: {
      version: 1,
      title: "Imported",
      width: EMPTY_DECK.width,
      height: EMPTY_DECK.height,
      slides: slides.length ? slides : EMPTY_DECK.slides,
    },
    warnings: ["ODP import without arco-deck.json uses a best-effort text-box mapping."],
    assets: [],
    sourcePackageBase64: Buffer.from(bytes).toString("base64"),
  };
}
