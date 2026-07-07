/**
 * GET /api/usage — the instance's cumulative token meter plus, when the
 * configured LLM endpoint is a LiteLLM-style gateway, live credit standing
 * from its /key/info self-lookup. Powers Settings → Usage & credits.
 */
import { Hono } from "hono";
import { loadSettings } from "../env.js";
import { readUsageTotals } from "../stores/usageStore.js";
import type { GatewayCredits, UsageResponse } from "../../shared/types.js";

const CACHE_MS = 30_000;
let cache: { at: number; credits: GatewayCredits | null } | null = null;

/** The /key/info fields we read; anything else in the payload is ignored. */
interface KeyInfoResponse {
  info?: { spend?: number; max_budget?: number | null; key_alias?: string | null };
}

async function fetchGatewayCredits(): Promise<GatewayCredits | null> {
  const settings = loadSettings();
  if (!settings.apiKey || !settings.baseUrl || settings.provider === "mock") return null;
  const base = settings.baseUrl.replace(/\/v1\/?$/, "");
  try {
    const res = await fetch(`${base}/key/info`, {
      headers: { Authorization: `Bearer ${settings.apiKey}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const info = ((await res.json()) as KeyInfoResponse).info;
    if (!info || typeof info.spend !== "number") return null;
    const maxBudget = typeof info.max_budget === "number" ? info.max_budget : null;
    return {
      spend: info.spend,
      maxBudget,
      remaining: maxBudget === null ? null : Math.max(0, maxBudget - info.spend),
      ...(info.key_alias ? { keyAlias: info.key_alias } : {}),
    };
  } catch {
    // Plain providers (OpenAI, Ollama, …) have no /key/info — the local
    // meter still renders, the credits panel just doesn't.
    return null;
  }
}

export const usageRoutes = new Hono();

usageRoutes.get("/", async (c) => {
  const refresh = c.req.query("refresh") === "1";
  if (refresh || !cache || Date.now() - cache.at > CACHE_MS) {
    cache = { at: Date.now(), credits: await fetchGatewayCredits() };
  }
  const res: UsageResponse = { local: readUsageTotals(), credits: cache.credits };
  return c.json(res);
});
