import type { DeckDoc, ExportResult, ImportResult, SlideBox } from "../types.js";
import { EMPTY_DECK } from "../types.js";

function escapeHtml(text: string): string {
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

export function exportSlidesHtml(deck: DeckDoc): ExportResult {
  const slides = deck.slides
    .map((slide, i) => {
      const boxes = slide.boxes
        .map((box) => {
          const style = `position:absolute;left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;`;
          if (box.kind === "image") {
            return `<img class="box" data-id="${escapeHtml(box.id)}" src="${escapeHtml(String(box.content ?? ""))}" style="${style}" alt="" />`;
          }
          if (box.kind === "shape") {
            const shape = box.shape ?? "rect";
            const stroke = box.stroke
              ? `border:${box.strokeWidth ?? 2}px solid ${escapeHtml(box.stroke)};`
              : "";
            const fill = `background:${escapeHtml(box.fill ?? "#6ea8fe")};`;
            const radius =
              shape === "ellipse"
                ? "border-radius:50%;"
                : shape === "line"
                  ? "border-radius:999px;"
                  : "";
            const clip =
              shape === "triangle"
                ? "clip-path:polygon(50% 0%,0% 100%,100% 100%);"
                : shape === "diamond"
                  ? "clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%);"
                  : "";
            return `<div class="box shape" data-id="${escapeHtml(box.id)}" data-shape="${shape}" style="${style}${fill}${stroke}${radius}${clip}"></div>`;
          }
          const textColor = box.color ? `color:${escapeHtml(box.color)};` : "";
          const textStroke = box.stroke
            ? `outline:${box.strokeWidth ?? 1}px solid ${escapeHtml(box.stroke)};`
            : "";
          const textFill = box.fill ? `background:${escapeHtml(box.fill)};` : "";
          return `<div class="box text" data-id="${escapeHtml(box.id)}" style="${style}text-align:${box.textAlign ?? "left"};${textColor}${textStroke}${textFill}">${escapeHtml(boxText(box))}</div>`;
        })
        .join("\n");
      return `<section class="slide" data-slide="${i}" style="width:${deck.width}px;height:${deck.height}px;position:relative;background:#111;color:#fff;margin:1rem auto;overflow:hidden">${boxes}</section>`;
    })
    .join("\n");
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(deck.title ?? "Presentation")}</title>
<style>body{font-family:system-ui,sans-serif;background:#222;margin:0;padding:1rem}.slide{box-shadow:0 8px 24px #0008}</style>
</head><body>
<script type="application/json" id="arco-deck">${JSON.stringify(deck).replace(/</g, "\\u003c")}</script>
${slides}
</body></html>
`;
  return {
    bytes: new TextEncoder().encode(html),
    mimeType: "text/html",
    filenameExt: "html",
    warnings: [],
  };
}

export function importSlidesHtml(html: string): ImportResult<DeckDoc> {
  const jsonMatch = html.match(/<script[^>]*id="arco-deck"[^>]*>([\s\S]*?)<\/script>/i);
  if (jsonMatch) {
    try {
      return { content: JSON.parse(jsonMatch[1]) as DeckDoc, warnings: [], assets: [] };
    } catch {
      /* fall through */
    }
  }
  const warnings = ["HTML import without arco-deck JSON produced an empty deck scaffold."];
  return { content: { ...EMPTY_DECK }, warnings, assets: [] };
}
