/**
 * List models from an OpenAI-compatible endpoint (Kosmos Cloud gateway,
 * custom baseUrl, Ollama, …) via GET {baseUrl}/models.
 */
export interface RemoteLlmModel {
  id: string;
  name: string;
}

function modelsUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? `${trimmed}/models` : `${trimmed}/v1/models`;
}

export async function listRemoteLlmModels(
  baseUrl: string,
  apiKey = "",
): Promise<RemoteLlmModel[]> {
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
    const body = await res.text().catch(() => "");
    throw new Error(
      body.trim()
        ? `Could not list models (${res.status}): ${body.slice(0, 200)}`
        : `Could not list models (HTTP ${res.status})`,
    );
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
