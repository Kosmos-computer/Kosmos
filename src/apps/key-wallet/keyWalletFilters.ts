import type { KeyEntry, KeyScope, KeyScopeFilter } from "./types";

const SCOPE_LABELS: Record<KeyScope, string> = {
  llm: "LLM",
  mcp: "MCP",
  channel: "Channels",
  external: "External",
  model: "Models",
  acp: "ACP",
};

export function keyScopeLabel(scope: KeyScope): string {
  return SCOPE_LABELS[scope];
}

export function matchesKeyScope(key: KeyEntry, filter: KeyScopeFilter): boolean {
  if (filter === "all") return true;
  return key.scope === filter;
}

export function matchesKeySearch(key: KeyEntry, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystacks = [key.name, key.envName, key.usedBy, key.description ?? "", keyScopeLabel(key.scope)];
  return haystacks.some((value) => value.toLowerCase().includes(normalized));
}

export function filterKeys(keys: KeyEntry[], query: string, scopeFilter: KeyScopeFilter): KeyEntry[] {
  return keys.filter((key) => matchesKeySearch(key, query) && matchesKeyScope(key, scopeFilter));
}
