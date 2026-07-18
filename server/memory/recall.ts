/**
 * Budgeted memory recall for turn prefill — Hermes-style injection of
 * relevant entries into the system prompt before the model runs.
 *
 * Phase 1 uses keyword search only (vector/RAG lands later). The model never
 * sees memory the principal cannot read; token budget is a hard cap.
 */
import type {
  MemoryPrincipalId,
  RecallBudget,
  RecallBundle,
  RecallHit,
} from "../../shared/capabilities/memory.js";
import { memoryStore } from "./memoryStore.js";

const DEFAULT_BUDGET: RecallBudget = { maxTokens: 800, maxItems: 6 };

/** Rough token estimate — ~4 chars/token, good enough for budgeting. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface RecallForTurnOpts {
  principalId: MemoryPrincipalId;
  userMessage: string;
  budget?: Partial<RecallBudget>;
}

/**
 * Search memory for hits relevant to the user message and return a
 * prompt-ready bundle. Empty when the query is blank or nothing matches.
 */
export function recallForTurn(opts: RecallForTurnOpts): RecallBundle {
  const query = opts.userMessage.trim();
  if (!query) return { hits: [], tokenEstimate: 0 };

  const budget: RecallBudget = {
    maxTokens: opts.budget?.maxTokens ?? DEFAULT_BUDGET.maxTokens,
    maxItems: opts.budget?.maxItems ?? DEFAULT_BUDGET.maxItems,
  };

  let entries;
  try {
    entries = memoryStore.search(opts.principalId, {
      query,
      limit: Math.min(budget.maxItems * 2, 20),
    });
  } catch {
    return { hits: [], tokenEstimate: 0 };
  }

  // Prefer active entries; skip pending drafts the human hasn't approved.
  const candidates = entries.filter((e) => e.status === "active" || e.status === "conflicted");

  const hits: RecallHit[] = [];
  let tokens = 0;
  for (const entry of candidates) {
    if (hits.length >= budget.maxItems) break;
    const excerpt = (entry.summary || entry.body || entry.title).slice(0, 400);
    const hitTokens = estimateTokens(`${entry.title}\n${excerpt}`);
    if (tokens + hitTokens > budget.maxTokens && hits.length > 0) break;
    hits.push({
      entryId: entry.id,
      kind: entry.kind,
      title: entry.title,
      excerpt,
      score: 1,
      citation: `memory:${entry.id}`,
    });
    tokens += hitTokens;
  }

  return { hits, tokenEstimate: tokens };
}

/** Format a recall bundle as system-prompt text (empty string if no hits). */
export function formatRecallForPrompt(bundle: RecallBundle): string {
  if (bundle.hits.length === 0) return "";
  const lines = [
    "Relevant memory (budgeted recall — cite by id if you use a fact):",
    ...bundle.hits.map(
      (h, i) =>
        `${i + 1}. [${h.kind}] ${h.title} (id=${h.entryId})\n   ${h.excerpt}`,
    ),
  ];
  return lines.join("\n");
}
