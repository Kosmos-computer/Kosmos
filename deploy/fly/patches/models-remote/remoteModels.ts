/**
 * Patch for older tenant images — lists Kosmos Cloud models from OpenRouter
 * with Fast/Med/High + cost-dot metadata.
 */
import type { Settings } from "../../shared/types.js";
import {
  fetchKosmosCloudModels,
  formatKosmosModelMeta,
  type KosmosCloudModel,
} from "../../shared/kosmosCloudModels.js";

const KOSMOS_GATEWAY_HOST = "kosmos-gateway.fly.dev";

function isKosmosCloudLlmEndpoint(baseUrl: string): boolean {
  const trimmed = baseUrl.trim();
  if (!trimmed) return false;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    return host === KOSMOS_GATEWAY_HOST || host.endsWith(`.${KOSMOS_GATEWAY_HOST}`);
  } catch {
    return /kosmos-gateway/i.test(trimmed);
  }
}

export interface RemoteLlmModel {
  id: string;
  name: string;
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

export async function listRemoteLlmModels(
  baseUrl: string,
  apiKey = "",
): Promise<RemoteLlmModel[]> {
  if (isKosmosCloudLlmEndpoint(baseUrl)) {
    const models = await fetchKosmosCloudModels();
    return models.map((m) => ({
      id: m.id,
      name: m.name,
      speed: m.speed,
      cost: m.cost,
      description: formatKosmosModelMeta(m.speed, m.cost),
    }));
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
