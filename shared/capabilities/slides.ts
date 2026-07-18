/**
 * os.slides@1 — thin presentation contract over os.files@1.
 *
 * Decks live as JSON (application/x-os-slides+json).
 */
import { SLIDES_MIME } from "./files.js";

export const SLIDES_CONTRACT_ID = "os.slides@1";

export const EMPTY_SLIDES_JSON = {
  version: 1,
  title: "Untitled presentation",
  width: 960,
  height: 540,
  slides: [{ id: "slide-1", boxes: [] }],
} as const;

export const SLIDES_INTENTS = {
  "slides.create": "write",
  "slides.open": "read",
  "slides.write": "write",
  "slides.export": "read",
  "slides.import": "write",
} as const;

export type SlidesIntentId = keyof typeof SLIDES_INTENTS;

export const SLIDES_EXPORT_FORMATS = ["json", "html", "odp", "pptx", "pdf"] as const;

/** Agent / UI-facing description of DeckDoc boxes (960×540 canvas). */
export const SLIDES_DECK_CONTENT_DESCRIPTION = `Full DeckDoc JSON (not an empty shell). Canvas is 960×540.
Required: version (1), width (960), height (540), slides[].
Each slide: { id, boxes[] }.
Each box: { id, kind: "text"|"shape"|"image", x, y, w, h, ... }.
Text: content is TipTap JSON {type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"..."}]}]} or a plain string; optional color, fill, stroke, textAlign.
Shape: shape "rect"|"ellipse"|"triangle"|"diamond"|"line"; fill, stroke, strokeWidth.
Image: content is a data-URL or http(s) URL.
Layout tip: title ~ x:60 y:60 w:840 h:90; body ~ x:60 y:180 w:840 h:280.`;

type AnyBox = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeBox(raw: unknown, index: number): AnyBox {
  const box = asRecord(raw) ?? {};
  const kindRaw = String(box.kind ?? box.type ?? "text");
  const kind = kindRaw === "shape" || kindRaw === "image" ? kindRaw : "text";
  const id = typeof box.id === "string" && box.id ? box.id : `box-${index + 1}`;
  const x = typeof box.x === "number" ? box.x : 60;
  const y = typeof box.y === "number" ? box.y : 60 + index * 40;
  const w = typeof box.w === "number" ? box.w : kind === "shape" ? 240 : 840;
  const h = typeof box.h === "number" ? box.h : kind === "shape" ? 140 : 96;

  let content = box.content;
  if (content == null && typeof box.text === "string") {
    content =
      kind === "image"
        ? box.text
        : {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: box.text }] }],
          };
  }
  if (typeof content === "string" && kind === "text") {
    content = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: content }] }],
    };
  }

  const next: AnyBox = { id, kind, x, y, w, h };
  if (content !== undefined) next.content = content;
  if (typeof box.fill === "string") next.fill = box.fill;
  if (typeof box.stroke === "string") next.stroke = box.stroke;
  if (typeof box.strokeWidth === "number") next.strokeWidth = box.strokeWidth;
  if (typeof box.color === "string") next.color = box.color;
  if (box.textAlign === "left" || box.textAlign === "center" || box.textAlign === "right") {
    next.textAlign = box.textAlign;
  }
  if (typeof box.shape === "string") next.shape = box.shape;
  if (typeof box.groupId === "string") next.groupId = box.groupId;
  if (kind === "shape" && !next.shape) next.shape = "rect";
  if (kind === "shape" && typeof next.fill !== "string") next.fill = "#6ea8fe";
  if (kind === "text" && typeof next.color !== "string") next.color = "#ececee";
  return next;
}

function normalizeSlide(raw: unknown, index: number): Record<string, unknown> {
  const slide = asRecord(raw) ?? {};
  const id = typeof slide.id === "string" && slide.id ? slide.id : `slide-${index + 1}`;
  const boxesRaw = Array.isArray(slide.boxes) ? slide.boxes : [];
  const boxes = boxesRaw.map((box, i) => normalizeBox(box, i));
  const next: Record<string, unknown> = { id, boxes };
  if (typeof slide.notes === "string") next.notes = slide.notes;
  return next;
}

/** Coerce agent/legacy deck JSON into editor-compatible DeckDoc shape. */
export function normalizeDeck(raw: unknown): {
  version: number;
  title?: string;
  width: number;
  height: number;
  slides: Record<string, unknown>[];
} {
  const deck = asRecord(raw) ?? {};
  const slidesRaw = Array.isArray(deck.slides) ? deck.slides : [];
  const slides =
    slidesRaw.length > 0
      ? slidesRaw.map((slide, i) => normalizeSlide(slide, i))
      : [{ id: "slide-1", boxes: [] }];
  return {
    version: typeof deck.version === "number" ? deck.version : 1,
    ...(typeof deck.title === "string" ? { title: deck.title } : {}),
    width: typeof deck.width === "number" ? deck.width : EMPTY_SLIDES_JSON.width,
    height: typeof deck.height === "number" ? deck.height : EMPTY_SLIDES_JSON.height,
    slides,
  };
}

export const SLIDES_INTENT_SCHEMAS: Record<string, Record<string, unknown>> = {
  "slides.create": {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", description: "File name, e.g. Launch.slides.json" },
      parentId: { type: ["string", "null"] },
      content: {
        type: "object",
        description: SLIDES_DECK_CONTENT_DESCRIPTION,
      },
    },
  },
  "slides.open": {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } },
  },
  "slides.write": {
    type: "object",
    required: ["id", "content"],
    properties: {
      id: { type: "string", description: "Presentation file id" },
      content: {
        type: "object",
        description: SLIDES_DECK_CONTENT_DESCRIPTION,
      },
    },
  },
  "slides.export": {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
      format: { type: "string", enum: [...SLIDES_EXPORT_FORMATS], default: "json" },
    },
  },
  "slides.import": {
    type: "object",
    required: ["name", "format", "contentBase64"],
    properties: {
      name: { type: "string" },
      parentId: { type: ["string", "null"] },
      format: { type: "string", enum: ["html", "odp", "pptx", "json"] },
      contentBase64: { type: "string" },
      retainSource: { type: "boolean", default: true },
    },
  },
};

export { SLIDES_MIME };
