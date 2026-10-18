/**
 * os.engine@1 — the live kosmos-engine session the shell and the chat share.
 *
 * The OS does not reimplement the sim. `open` attaches to a protocol port
 * (an already running `kosmos serve` or `kosmos-app --serve-port`), or starts
 * one. `query` is the read half of that protocol. `call` is everything else.
 * Plane, GitHub, and OpenHands are reported by `bridge` so one status answers
 * "what can this chat reach?"
 */

export const ENGINE_CONTRACT_ID = "os.engine@1";

export const ENGINE_INTENTS = {
  "engine.status": "read",
  "engine.bridge": "read",
  "engine.open": "write",
  "engine.close": "write",
  "engine.query": "read",
  "engine.call": "write",
} as const;

export type EngineIntentId = keyof typeof ENGINE_INTENTS;

const REQUEST = {
  type: "object",
  description: "One kosmos protocol request. `t` is the request type (query, hash, step, …).",
  properties: {
    t: { type: "string" },
  },
  required: ["t"],
  additionalProperties: true,
};

export const ENGINE_INTENT_SCHEMAS: Record<EngineIntentId, Record<string, unknown>> = {
  "engine.status": { type: "object", properties: {} },
  "engine.bridge": { type: "object", properties: {} },
  "engine.open": { type: "object", properties: {} },
  "engine.close": { type: "object", properties: {} },
  "engine.query": {
    type: "object",
    properties: { request: REQUEST },
    required: ["request"],
  },
  "engine.call": {
    type: "object",
    properties: { request: REQUEST },
    required: ["request"],
  },
};
