/** Stub @cursor/sdk for embedded Android sidecar (subprocess agents unavailable). */

export class CursorAgentError extends Error {
  constructor(message) {
    super(message);
    this.name = "CursorAgentError";
  }
}

export class Cursor {
  static async create() {
    throw new CursorAgentError("Cursor SDK is not available in Arco Local on Android.");
  }
}

export class Agent {
  constructor() {
    throw new CursorAgentError("Cursor SDK is not available in Arco Local on Android.");
  }
}

/** @typedef {Record<string, unknown>} AgentOptions */
/** @typedef {Record<string, unknown>} InteractionUpdate */
/** @typedef {Record<string, unknown>} McpServerConfig */
/** @typedef {Record<string, unknown>} SDKAgent */

export const AgentOptions = {};
export const InteractionUpdate = {};
export const McpServerConfig = {};
export const SDKAgent = {};
