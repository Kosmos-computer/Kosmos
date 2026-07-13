import pptxgen from "pptxgenjs";
import JSZip from "jszip";
import type { DeckDoc, ExportResult, ImportResult, Slide, SlideBox } from "../types.js";
import { EMPTY_DECK } from "../types.js";

type PptxCtor = new () => InstanceType<typeof pptxgen>;
const PptxGenJS = ((pptxgen as unknown as { default?: PptxCtor }).default ??
  pptxgen) as PptxCtor;

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

export async function exportPptx(deck: DeckDoc): Promise<ExportResult> {
  const pptx = new PptxGenJS();
  pptx.title = deck.title ?? "Presentation";
  pptx.defineLayout({ name: "ARCO", width: 13.333, height: 7.5 });
  pptx.layout = "ARCO";
  for (const slide of deck.slides) {
    const s = pptx.addSlide();
    for (const box of slide.boxes) {
      const x = (box.x / deck.width) * 13.333;
      const y = (box.y / deck.height) * 7.5;
      const w = (box.w / deck.width) * 13.333;
      const h = (box.h / deck.height) * 7.5;
      if (box.kind === "shape") {
        s.addShape(pptx.ShapeType.rect, {
          x,
          y,
          w,
          h,
          fill: { color: (box.fill ?? "#6ea8fe").replace("#", "") },
        });
      } else if (box.kind === "image" && typeof box.content === "string") {
        try {
          s.addImage({ data: box.content, x, y, w, h });
        } catch {
          s.addText("[image]", { x, y, w, h });
        }
      } else {
        s.addText(boxText(box), {
          x,
          y,
          w,
          h,
          align: box.textAlign ?? "left",
          color: "FFFFFF",
          fontSize: 18,
        });
      }
    }
  }
  const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  // Embed arco-deck.json by re-opening the zip for lossless round-trip.
  const zip = await JSZip.loadAsync(buffer);
  zip.file("arco-deck.json", JSON.stringify(deck));
  const bytes = await zip.generateAsync({ type: "uint8array" });
  return {
    bytes,
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    filenameExt: "pptx",
    warnings: [],
  };
}

export async function importPptx(bytes: Uint8Array): Promise<ImportResult<DeckDoc>> {
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
  const slideFiles = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort();
  const slides: Slide[] = [];
  for (const [i, name] of slideFiles.entries()) {
    const xml = await zip.file(name)?.async("string");
    if (!xml) continue;
    const boxes: SlideBox[] = [];
    const texts = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) => m[1]);
    texts.forEach((text, bi) => {
      boxes.push({
        id: `box-${bi + 1}`,
        kind: "text",
        x: 48,
        y: 48 + bi * 64,
        w: 800,
        h: 56,
        content: {
          type: "doc",
          content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }],
        },
      });
    });
    slides.push({ id: `slide-${i + 1}`, boxes });
  }
  return {
    content: {
      version: 1,
      title: "Imported",
      width: EMPTY_DECK.width,
      height: EMPTY_DECK.height,
      slides: slides.length ? slides : EMPTY_DECK.slides,
    },
    warnings: ["PPTX import without arco-deck.json extracts text runs only."],
    assets: [],
    sourcePackageBase64: Buffer.from(bytes).toString("base64"),
  };
}

/** PDF export is one-way: emit a minimal PDF with slide titles as text. */
export async function exportPdf(deck: DeckDoc): Promise<ExportResult> {
  const lines = deck.slides.map((slide, i) => {
    const text = slide.boxes.map(boxText).filter(Boolean).join(" / ") || `(slide ${i + 1})`;
    return `Slide ${i + 1}: ${text}`;
  });
  // Minimal valid single-page PDF with Helvetica text lines.
  const contentLines = lines
    .slice(0, 40)
    .map((line, i) => `BT /F1 12 Tf 50 ${750 - i * 18} Td (${line.replace(/[\\()]/g, "")}) Tj ET`)
    .join("\n");
  const stream = contentLines;
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj",
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return {
    bytes: new TextEncoder().encode(pdf),
    mimeType: "application/pdf",
    filenameExt: "pdf",
    warnings: ["PDF export is one-way (titles/text summary); re-import is not supported."],
  };
}
