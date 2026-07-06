/**
 * os.docs@1 — thin document contract over os.files@1.
 *
 * Content lives in the file store as TipTap JSON (application/x-os-doc+json).
 * These intents are convenience wrappers so callers (and the agent) can say
 * "create a doc" without repeating mime-type conventions.
 */
import { DOC_MIME } from "./files.js";

export const DOCS_CONTRACT_ID = "os.docs@1";

/** Default empty TipTap document — reserved widget node shape included. */
export const EMPTY_DOC_JSON = {
  type: "doc",
  content: [{ type: "paragraph" }],
} as const;

export const DOCS_INTENTS = {
  "docs.create": "write",
  "docs.open": "read",
  "docs.export": "read",
} as const;

export type DocsIntentId = keyof typeof DOCS_INTENTS;

export const DOCS_INTENT_SCHEMAS: Record<string, Record<string, unknown>> = {
  "docs.create": {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", description: "File name, e.g. Quarterly plan.doc.json" },
      parentId: { type: ["string", "null"], description: "Folder id, or null for root" },
      content: {
        type: "object",
        description: "TipTap JSON document; defaults to an empty doc",
      },
    },
  },
  "docs.open": {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", description: "File id in the OS store" } },
  },
  "docs.export": {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string" },
      format: { type: "string", enum: ["json", "markdown"], default: "json" },
    },
  },
};

export { DOC_MIME };
