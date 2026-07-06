/**
 * Contract registry — every capability contract the OS defines, keyed by id.
 * One vocabulary, two views: contracts are the provider-side grouping (what
 * an app implements, what the default-provider registry points at); intents
 * are the caller-side units (what gets granted, confirmed, and audited).
 */
import { CALENDAR_CONTRACT_ID, CALENDAR_INTENTS, CALENDAR_INTENT_SCHEMAS } from "./calendar.js";
import { DOCS_CONTRACT_ID, DOCS_INTENTS, DOCS_INTENT_SCHEMAS } from "./docs.js";
import { FILES_CONTRACT_ID, FILES_INTENTS, FILES_INTENT_SCHEMAS } from "./files.js";
import { SHEETS_CONTRACT_ID, SHEETS_INTENTS, SHEETS_INTENT_SCHEMAS } from "./sheets.js";
import { VOICE_CONTRACT_ID, VOICE_INTENTS, VOICE_INTENT_SCHEMAS } from "./voice.js";
import { MEMORY_CONTRACT_ID, MEMORY_INTENTS, MEMORY_INTENT_SCHEMAS } from "./memory.js";

export type IntentAccess = "read" | "write";

/** contractId → (intentId → access class) */
export const CONTRACTS: Record<string, Record<string, IntentAccess>> = {
  [CALENDAR_CONTRACT_ID]: CALENDAR_INTENTS,
  [FILES_CONTRACT_ID]: FILES_INTENTS,
  [DOCS_CONTRACT_ID]: DOCS_INTENTS,
  [SHEETS_CONTRACT_ID]: SHEETS_INTENTS,
  [VOICE_CONTRACT_ID]: VOICE_INTENTS,
  [MEMORY_CONTRACT_ID]: MEMORY_INTENTS,
};

/** intentId → JSON Schema for its params (for tool-shaped exposure). */
export const INTENT_SCHEMAS: Record<string, Record<string, unknown>> = {
  ...CALENDAR_INTENT_SCHEMAS,
  ...FILES_INTENT_SCHEMAS,
  ...DOCS_INTENT_SCHEMAS,
  ...SHEETS_INTENT_SCHEMAS,
  ...VOICE_INTENT_SCHEMAS,
  ...MEMORY_INTENT_SCHEMAS,
};

export function intentSchema(intentId: string): Record<string, unknown> {
  return INTENT_SCHEMAS[intentId] ?? { type: "object", properties: {} };
}

export interface IntentMeta {
  contractId: string;
  access: IntentAccess;
}

/** Resolve an intent id to its contract and access class. */
export function intentMeta(intentId: string): IntentMeta | undefined {
  for (const [contractId, intents] of Object.entries(CONTRACTS)) {
    const access = intents[intentId];
    if (access) return { contractId, access };
  }
  return undefined;
}
