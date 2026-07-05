/**
 * Contract registry — every capability contract the OS defines, keyed by id.
 * One vocabulary, two views: contracts are the provider-side grouping (what
 * an app implements, what the default-provider registry points at); intents
 * are the caller-side units (what gets granted, confirmed, and audited).
 */
import { CALENDAR_CONTRACT_ID, CALENDAR_INTENTS, CALENDAR_INTENT_SCHEMAS } from "./calendar.js";

export type IntentAccess = "read" | "write";

/** contractId → (intentId → access class) */
export const CONTRACTS: Record<string, Record<string, IntentAccess>> = {
  [CALENDAR_CONTRACT_ID]: CALENDAR_INTENTS,
};

/** intentId → JSON Schema for its params (for tool-shaped exposure). */
export const INTENT_SCHEMAS: Record<string, Record<string, unknown>> = {
  ...CALENDAR_INTENT_SCHEMAS,
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
