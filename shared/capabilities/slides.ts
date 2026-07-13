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
  "slides.export": "read",
  "slides.import": "write",
} as const;

export type SlidesIntentId = keyof typeof SLIDES_INTENTS;

export const SLIDES_EXPORT_FORMATS = ["json", "html", "odp", "pptx", "pdf"] as const;

export const SLIDES_INTENT_SCHEMAS: Record<string, Record<string, unknown>> = {
  "slides.create": {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", description: "File name, e.g. Launch.slides.json" },
      parentId: { type: ["string", "null"] },
      content: { type: "object", description: "Deck JSON; defaults to empty deck" },
    },
  },
  "slides.open": {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } },
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
