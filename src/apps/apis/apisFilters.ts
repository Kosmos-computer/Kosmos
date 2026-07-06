import type { ApiCatalogTab, ApiIntegration } from "./types";

export function matchesApiSearch(api: ApiIntegration, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystacks = [api.name, api.description, api.author, api.category, api.id];
  return haystacks.some((value) => value.toLowerCase().includes(normalized));
}

export function filterApis(
  apis: ApiIntegration[],
  query: string,
  tab: ApiCatalogTab,
): ApiIntegration[] {
  return apis.filter((api) => {
    if (tab === "installed" && !api.installed) return false;
    if (tab === "marketplace" && api.installed) return false;
    return matchesApiSearch(api, query);
  });
}

export function apiCategoryCounts(apis: ApiIntegration[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const api of apis) {
    counts[api.category] = (counts[api.category] ?? 0) + 1;
  }
  return counts;
}
