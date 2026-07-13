import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  ExternalHyperlink,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import mammoth from "mammoth";
import type { DocNode, ExportResult, ImportResult } from "../types.js";
import { importHtml } from "./html.js";

function runsFromInline(nodes: DocNode[] = []): (TextRun | ExternalHyperlink)[] {
  const runs: (TextRun | ExternalHyperlink)[] = [];
  for (const node of nodes) {
    if (node.type === "hardBreak") {
      runs.push(new TextRun({ break: 1 }));
      continue;
    }
    if (node.type !== "text") continue;
    const marks = node.marks ?? [];
    const link = marks.find((m) => m.type === "link");
    const opts = {
      text: node.text ?? "",
      bold: marks.some((m) => m.type === "bold"),
      italics: marks.some((m) => m.type === "italic"),
      underline: marks.some((m) => m.type === "underline") ? {} : undefined,
      strike: marks.some((m) => m.type === "strike"),
      font: marks.some((m) => m.type === "code") ? "Courier New" : undefined,
    };
    if (link) {
      runs.push(
        new ExternalHyperlink({
          children: [new TextRun(opts)],
          link: String(link.attrs?.href ?? ""),
        }),
      );
    } else {
      runs.push(new TextRun(opts));
    }
  }
  return runs;
}

function blocksToDocx(nodes: DocNode[] = []): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "heading": {
        const level = Math.min(3, Math.max(1, Number(node.attrs?.level) || 1));
        const heading =
          level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3;
        out.push(new Paragraph({ heading, children: runsFromInline(node.content) }));
        break;
      }
      case "paragraph":
        out.push(new Paragraph({ children: runsFromInline(node.content) }));
        break;
      case "blockquote":
        for (const child of node.content ?? []) {
          out.push(new Paragraph({ children: runsFromInline(child.content), indent: { left: 720 } }));
        }
        break;
      case "codeBlock":
        out.push(
          new Paragraph({
            children: [new TextRun({ text: (node.content ?? []).map((c) => c.text ?? "").join(""), font: "Courier New" })],
          }),
        );
        break;
      case "bulletList":
      case "orderedList":
        for (const [i, item] of (node.content ?? []).entries()) {
          const textNodes = (item.content ?? []).flatMap((c) => c.content ?? []);
          out.push(
            new Paragraph({
              children: runsFromInline(textNodes),
              bullet: node.type === "bulletList" ? { level: 0 } : undefined,
              numbering:
                node.type === "orderedList"
                  ? { reference: "numbered-list", level: 0 }
                  : undefined,
            }),
          );
          void i;
        }
        break;
      case "horizontalRule":
        out.push(new Paragraph({ children: [new TextRun("―")] }));
        break;
      case "table": {
        const rows = (node.content ?? []).map(
          (row) =>
            new TableRow({
              children: (row.content ?? []).map(
                (cell) =>
                  new TableCell({
                    width: { size: 2000, type: WidthType.DXA },
                    children: [
                      new Paragraph({
                        children: runsFromInline(
                          (cell.content ?? []).flatMap((c) => (c.type === "paragraph" ? c.content ?? [] : [c])),
                        ),
                      }),
                    ],
                  }),
              ),
            }),
        );
        out.push(new Table({ rows, width: { size: 9000, type: WidthType.DXA } }));
        break;
      }
      default:
        break;
    }
  }
  return out.length ? out : [new Paragraph({ children: [] })];
}

export async function importDocx(bytes: Uint8Array): Promise<ImportResult<DocNode>> {
  const result = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) });
  const imported = importHtml(result.value);
  const warnings = [
    ...imported.warnings,
    ...result.messages.map((m) => m.message),
    "DOCX import maps through HTML to the Arco Docs surface.",
  ];
  return {
    content: imported.content,
    warnings,
    assets: [],
    sourcePackageBase64: Buffer.from(bytes).toString("base64"),
  };
}

export async function exportDocx(doc: DocNode): Promise<ExportResult> {
  const children = blocksToDocx(doc.content ?? []);
  const document = new Document({
    numbering: {
      config: [
        {
          reference: "numbered-list",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: "left",
            },
          ],
        },
      ],
    },
    sections: [{ children }],
  });
  const buffer = await Packer.toBuffer(document);
  return {
    bytes: new Uint8Array(buffer),
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    filenameExt: "docx",
    warnings: [],
  };
}
