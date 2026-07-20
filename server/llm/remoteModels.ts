/**
 * List models from an OpenAI-compatible endpoint (Kosmos Cloud gateway,
 * custom baseUrl, Ollama, …) via GET {baseUrl}/models.
 *
 * Kosmos Cloud uses the OpenRouter public catalog (enriched with speed/cost)
 * because the LiteLLM gateway advertises only a few aliases + an openrouter/*
 * wildcard — not the full upstream set.
 */
import { isKosmosCloudLlmEndpoint } from "../../shared/llmProviderLabels.js";
import {
  fetchKosmosCloudModels,
  formatKosmosModelMeta,
  type KosmosCloudModel,
} from "../../shared/kosmosCloudModels.js";
import type { Settings } from "../../shared/types.js";

export interface RemoteLlmModel {
  id: string;
  name: string;
  /** Secondary picker line, e.g. "Fast · ••oo". */
  description?: string;
  speed?: KosmosCloudModel["speed"];
  cost?: KosmosCloudModel["cost"];
}

export type RemoteModelsAuthError = {
  code: "auth_required";
  message: string;
};

function modelsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? `${trimmed}/models` : `${trimmed}/v1/models`;
}

/**
 * Pick the API key for a remote /models list.
 * Kosmos gateway must only receive a LiteLLM virtual / credits key — never an
 * OpenAI/Anthropic key that happens to live in settings.apiKey for another provider.
 */
export function resolveRemoteListApiKey(
  baseUrl: string,
  settings: Settings,
  bodyKey?: string,
): { apiKey: string } | RemoteModelsAuthError {
  const trimmedBody = bodyKey?.trim() || "";
  if (trimmedBody) return { apiKey: trimmedBody };

  if (isKosmosCloudLlmEndpoint(baseUrl)) {
    const kosmosDedicated = settings.apiKeys?.kosmos?.trim() || "";
    if (kosmosDedicated) return { apiKey: kosmosDedicated };
    // Only reuse settings.apiKey when the saved connection is already Kosmos.
    if (isKosmosCloudLlmEndpoint(settings.baseUrl) && settings.apiKey?.trim()) {
      return { apiKey: settings.apiKey.trim() };
    }
    return {
      code: "auth_required",
      message:
        "Kosmos Cloud needs a credits key from your subscription — not an OpenAI or Anthropic API key.",
    };
  }

  return {
    apiKey: settings.apiKey?.trim() || settings.apiKeys?.custom?.trim() || "",
  };
}

function withKosmosMeta(models: KosmosCloudModel[]): RemoteLlmModel[] {
  return models.map((m) => ({
    id: m.id,
    name: m.name,
    speed: m.speed,
    cost: m.cost,
    description: formatKosmosModelMeta(m.speed, m.cost),
  }));
}

export async function listRemoteLlmModels(
  baseUrl: string,
  apiKey = "",
): Promise<RemoteLlmModel[]> {
  // Kosmos Cloud: full OpenRouter catalog + speed/cost meta (gateway is a wildcard proxy).
  if (isKosmosCloudLlmEndpoint(baseUrl)) {
    return withKosmosMeta(await fetchKosmosCloudModels());
  }

  const url = modelsUrl(baseUrl);
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("Invalid base URL");
  }
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...(apiKey.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    // Never forward upstream bodies — LiteLLM echoes "Received API Key = sk-…" in 401s.
    if (res.status === 401 || res.status === 403) {
      const err = new Error(
        "This endpoint rejected the API key. Check the key in Settings → Model.",
      ) as Error & { code?: string };
      err.code = "auth_required";
      throw err;
    }
    void (await res.text().catch(() => ""));
    throw new Error(`Could not list models (HTTP ${res.status})`);
  }
  const payload = (await res.json()) as {
    data?: { id?: string; name?: string }[];
    models?: { id?: string; name?: string }[];
  };
  const rows = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.models)
      ? payload.models
      : [];
  return rows
    .filter((row): row is { id: string; name?: string } => Boolean(row?.id))
    .map((row) => ({
      id: row.id,
      name: row.name?.trim() || row.id,
    }));
}
