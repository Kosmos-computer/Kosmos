import type { KosmosDeployment, LlmProvider } from "./types.js";

/** Subset of deployment signals used for provider labeling. */
export type KosmosLabelContext = Pick<KosmosDeployment, "billingManaged" | "deployment"> | null | undefined;

const KOSMOS_GATEWAY_HOST = "kosmos-gateway.fly.dev";

/** Default OpenAI-compatible Kosmos Cloud gateway (supplier tab / credits). */
export const KOSMOS_CLOUD_GATEWAY_URL = `https://${KOSMOS_GATEWAY_HOST}/v1`;

/** True when baseUrl points at the Kosmos credits / LiteLLM gateway. */
export function isKosmosCloudLlmEndpoint(baseUrl: string): boolean {
  const trimmed = baseUrl.trim();
  if (!trimmed) return false;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    return host === KOSMOS_GATEWAY_HOST || host.endsWith(`.${KOSMOS_GATEWAY_HOST}`);
  } catch {
    return /kosmos-gateway/i.test(trimmed);
  }
}

/** True when the active custom endpoint is (or should be treated as) Kosmos Cloud. */
export function usesKosmosCloudService(baseUrl: string, deployment?: KosmosLabelContext): boolean {
  if (isKosmosCloudLlmEndpoint(baseUrl)) return true;
  return deployment?.billingManaged === true && deployment.deployment === "fly-tenant";
}

/** User-facing label for the custom LLM provider preset. */
export function customProviderLabel(baseUrl: string, deployment?: KosmosLabelContext): string {
  return usesKosmosCloudService(baseUrl, deployment) ? "Kosmos" : "Custom endpoint";
}

/** Registry / menu display name for a custom-endpoint model manifest. */
export function customEndpointModelName(baseUrl: string, deployment?: KosmosLabelContext): string {
  return customProviderLabel(baseUrl, deployment);
}

const STATIC_PROVIDER_LABELS: Record<Exclude<LlmProvider, "custom">, string> = {
  mock: "Mock (no key needed)",
  openai: "OpenAI",
  anthropic: "Anthropic",
  openrouter: "OpenRouter",
  ollama: "Ollama (local)",
  local: "Arco Models (local)",
};

export function llmProviderLabel(
  provider: LlmProvider,
  baseUrl = "",
  deployment?: KosmosLabelContext,
): string {
  if (provider === "custom") return customProviderLabel(baseUrl, deployment);
  return STATIC_PROVIDER_LABELS[provider];
}
