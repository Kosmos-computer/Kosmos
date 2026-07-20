/**
 * Kosmos Cloud model catalog helpers — speed/cost labels for the picker and
 * OpenRouter → LiteLLM id mapping for the credits gateway.
 */

export type KosmosSpeedTier = "fast" | "med" | "high";
/** 1 = cheapest … 4 = most expensive (shown as lit token dots). */
export type KosmosCostTier = 1 | 2 | 3 | 4;

export interface KosmosCloudModel {
  id: string;
  name: string;
  speed: KosmosSpeedTier;
  cost: KosmosCostTier;
  /** Blended $/MTok estimate used for cost bucketing (0 = free). */
  blendedUsdPerMTok?: number;
}

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

/** Friendly aliases kept in gateway config.yaml for LLM_MODEL defaults. */
export const KOSMOS_FRIENDLY_ALIASES: {
  id: string;
  name: string;
  openRouterId: string;
  speed: KosmosSpeedTier;
  cost: KosmosCostTier;
}[] = [
  {
    id: "qwen3-30b",
    name: "Qwen3 30B",
    openRouterId: "qwen/qwen3-30b-a3b-instruct-2507",
    speed: "fast",
    cost: 1,
  },
  {
    id: "qwen3-235b",
    name: "Qwen3 235B",
    openRouterId: "qwen/qwen3-235b-a22b-2507",
    speed: "med",
    cost: 2,
  },
  {
    id: "claude-sonnet",
    name: "Claude Sonnet",
    openRouterId: "anthropic/claude-sonnet-4.5",
    speed: "high",
    cost: 3,
  },
];

const SPEED_LABEL: Record<KosmosSpeedTier, string> = {
  fast: "Fast",
  med: "Med",
  high: "High",
};

/** Cost dots: lit • then dim o — e.g. cost 2 → "••oo". */
export function formatKosmosCostDots(cost: KosmosCostTier): string {
  const lit = Math.min(4, Math.max(1, cost));
  return `${"•".repeat(lit)}${"o".repeat(4 - lit)}`;
}

export function formatKosmosModelMeta(speed: KosmosSpeedTier, cost: KosmosCostTier): string {
  return `${SPEED_LABEL[speed]} · ${formatKosmosCostDots(cost)}`;
}

/** Map OpenRouter slug → LiteLLM request model (openrouter/* wildcard). */
export function toKosmosGatewayModelId(openRouterId: string): string {
  const id = openRouterId.trim().replace(/^openrouter\//i, "");
  return `openrouter/${id}`;
}

export function blendedUsdPerMTok(promptPerToken: number, completionPerToken: number): number {
  if (promptPerToken < 0 || completionPerToken < 0) return 0;
  return (promptPerToken * 0.7 + completionPerToken * 0.3) * 1_000_000;
}

export function costTierFromBlendedUsd(blended: number): KosmosCostTier {
  if (blended <= 0) return 1;
  if (blended < 0.5) return 1;
  if (blended < 2) return 2;
  if (blended < 8) return 3;
  return 4;
}

export function speedTierFromModel(id: string, name: string, blended: number): KosmosSpeedTier {
  const hay = `${id} ${name}`.toLowerCase();
  if (
    /\b(flash|mini|haiku|nano|lite|tiny|turbo|instant|8b|7b|3b|1\.5b|small)\b/.test(hay) ||
    blended > 0 && blended < 0.4
  ) {
    return "fast";
  }
  if (
    /\b(opus|pro|o1|o3|o4|reasoning|r1|405b|235b|ultra|max|sonnet-4|gpt-5|claude-4)\b/.test(hay) ||
    blended >= 4
  ) {
    return "high";
  }
  return "med";
}

type OpenRouterRow = {
  id?: string;
  name?: string;
  architecture?: {
    modality?: string;
    output_modalities?: string[];
    input_modalities?: string[];
  };
  pricing?: { prompt?: string; completion?: string };
};

function isChatTextModel(row: OpenRouterRow): boolean {
  const id = (row.id ?? "").toLowerCase();
  const name = (row.name ?? "").toLowerCase();
  if (!id) return false;
  if (id.includes("embed") || name.includes("embed")) return false;
  if (/(^|\/)(flux|stable-diffusion|dall-e|gpt-image|imagen|ssd-|sdxl)/.test(id)) return false;
  const outs = row.architecture?.output_modalities ?? [];
  if (outs.length > 0 && !outs.includes("text")) return false;
  const modality = row.architecture?.modality ?? "";
  if (modality && !modality.includes("->text") && modality !== "text") {
    // Allow multimodal→text; reject image-only generators.
    if (!outs.includes("text")) return false;
  }
  return true;
}

/** Normalize OpenRouter /models payload into Kosmos Cloud picker rows. */
export function kosmosModelsFromOpenRouterPayload(payload: unknown): KosmosCloudModel[] {
  const data = (payload as { data?: OpenRouterRow[] })?.data;
  if (!Array.isArray(data)) return [];

  const aliasOrIds = new Set(KOSMOS_FRIENDLY_ALIASES.map((a) => a.openRouterId));
  const rows: KosmosCloudModel[] = KOSMOS_FRIENDLY_ALIASES.map((a) => ({
    id: a.id,
    name: a.name,
    speed: a.speed,
    cost: a.cost,
  }));

  for (const row of data) {
    if (!isChatTextModel(row) || !row.id) continue;
    if (aliasOrIds.has(row.id)) continue;
    const prompt = Number(row.pricing?.prompt ?? 0);
    const completion = Number(row.pricing?.completion ?? 0);
    const blended = blendedUsdPerMTok(
      Number.isFinite(prompt) ? prompt : 0,
      Number.isFinite(completion) ? completion : 0,
    );
    const speed = speedTierFromModel(row.id, row.name ?? row.id, blended);
    const cost = costTierFromBlendedUsd(blended);
    rows.push({
      id: toKosmosGatewayModelId(row.id),
      name: (row.name ?? row.id).replace(/^[^:]+:\s*/, ""),
      speed,
      cost,
      blendedUsdPerMTok: blended,
    });
  }

  // Featured aliases first; then Fast → Med → High, cheaper first within tier.
  const speedRank: Record<KosmosSpeedTier, number> = { fast: 0, med: 1, high: 2 };
  const featured = rows.slice(0, KOSMOS_FRIENDLY_ALIASES.length);
  const rest = rows.slice(KOSMOS_FRIENDLY_ALIASES.length).sort((a, b) => {
    const sr = speedRank[a.speed] - speedRank[b.speed];
    if (sr !== 0) return sr;
    const cr = a.cost - b.cost;
    if (cr !== 0) return cr;
    return a.name.localeCompare(b.name);
  });
  return [...featured, ...rest];
}

let cache: { at: number; models: KosmosCloudModel[] } | null = null;
const CACHE_MS = 10 * 60 * 1000;

/** Fetch + cache OpenRouter's public catalog for Kosmos Cloud picker. */
export async function fetchKosmosCloudModels(timeoutMs = 12_000): Promise<KosmosCloudModel[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.models;
  const res = await fetch(OPENROUTER_MODELS_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`Could not list OpenRouter models (HTTP ${res.status})`);
  }
  const models = kosmosModelsFromOpenRouterPayload(await res.json());
  cache = { at: Date.now(), models };
  return models;
}
