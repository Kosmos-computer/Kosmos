export type KeyScope = "llm" | "mcp" | "channel" | "external" | "model" | "acp";

export interface KeyEntry {
  id: string;
  /** Human label, e.g. "Anthropic API key". */
  name: string;
  /** Env var or secret ref name — must match what subprocesses expect. */
  envName: string;
  scope: KeyScope;
  /** Where this key is consumed, e.g. "Model provider" or "MCP: GitHub". */
  usedBy: string;
  /** Masked value for display (`••••abcd`). */
  maskedValue: string;
  updatedAt: string;
  description?: string;
}

export type KeyScopeFilter = "all" | KeyScope;
