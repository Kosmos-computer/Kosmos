/**
 * OpenRouter model catalog — fetched from the public /api/v1/models endpoint.
 * Uses the saved OpenRouter API key when present (optional for listing).
 */
import type { OpenRouterModelInfo } from "../../shared/types.js";
import { loadSettings } from "../env.js";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

interface OpenRouterModelsResponse {
  data?: Array<{
    id: string;
    name?: string;
    description?: string;
    context_length?: number;
  }>;
}

function resolveApiKey(override?: string): string {
  const settings = loadSettings();
  return override?.trim() || settings.apiKey.trim() || process.env.LLM_API_KEY?.trim() || "";
}

/** List models from OpenRouter's public catalog. */
export async function listOpenRouterModels(apiKeyOverride?: string): Promise<OpenRouterModelInfo[]> {
  const apiKey = resolveApiKey(apiKeyOverride);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey && !apiKey.startsWith("••••")) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const res = await fetch(OPENROUTER_MODELS_URL, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `OpenRouter models request failed (${res.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }

  const payload = (await res.json()) as OpenRouterModelsResponse;
  const models = payload.data ?? [];

  return models
    .map((model) => ({
      id: model.id,
      displayName: model.name?.trim() || model.id,
      description: model.description?.trim() || undefined,
      contextLength: model.context_length,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
