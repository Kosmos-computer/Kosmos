/**
 * Per-instance token meter — cumulative totals in data/usage.json.
 *
 * Fed from streamTurn (every completion in the OS funnels through it) and
 * read by GET /api/usage for Settings → Usage & credits. On hosted instances
 * this is the local fallback when the gateway's /key/info is unreachable.
 */
import fs from "node:fs";
import path from "node:path";
import { dataDirs } from "../env.js";
import type { TokenUsage } from "../agent/llm.js";
import type { LocalUsageTotals } from "../../shared/types.js";

const FILE = path.join(dataDirs.root, "usage.json");

function emptyTotals(): LocalUsageTotals {
  const now = new Date().toISOString();
  return { since: now, updatedAt: now, promptTokens: 0, completionTokens: 0, totalTokens: 0, turns: 0 };
}

let cached: LocalUsageTotals | null = null;

export function readUsageTotals(): LocalUsageTotals {
  if (cached) return cached;
  try {
    cached = { ...emptyTotals(), ...(JSON.parse(fs.readFileSync(FILE, "utf-8")) as Partial<LocalUsageTotals>) };
  } catch {
    cached = emptyTotals();
  }
  return cached;
}

export function recordUsage(usage: TokenUsage): void {
  const totals = readUsageTotals();
  totals.promptTokens += usage.promptTokens;
  totals.completionTokens += usage.completionTokens;
  totals.totalTokens += usage.totalTokens;
  totals.turns += 1;
  totals.updatedAt = new Date().toISOString();
  try {
    fs.mkdirSync(dataDirs.root, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(totals, null, 2), "utf-8");
  } catch {
    // Metering must never break a turn — worst case the counter lags a write.
  }
}
