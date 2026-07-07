import type { SearchResultItem } from "../../components/patterns/search";

export interface WebSearchHit {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchHit[];
  resultCount: number;
  elapsedMs: number;
}

export interface SearchQueryResult {
  query: string;
  results: SearchResultItem[];
  relatedSearches: string[];
  knowledgePanel: null;
  resultCount: number;
  elapsedMs: number;
}

interface SearchOptions {
  limit?: number;
}

async function readApiError(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `${fallback} (${res.status})`;
}

export async function searchWeb(q: string, options?: SearchOptions): Promise<WebSearchResponse> {
  const params = new URLSearchParams({ q });
  if (options?.limit) params.set("limit", String(options.limit));

  const res = await fetch(`/api/search/web?${params}`);
  if (!res.ok) throw new Error(await readApiError(res, "Search failed"));
  return (await res.json()) as WebSearchResponse;
}

function displayUrlFor(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "");
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${host}${path}`.replace(/\/$/, "") || host;
  } catch {
    return url;
  }
}

export function mapWebResults(results: WebSearchHit[]): SearchResultItem[] {
  return results.map((hit, index) => ({
    id: `web-${index}-${encodeURIComponent(hit.url).slice(0, 48)}`,
    title: hit.title || hit.url,
    url: hit.url,
    displayUrl: displayUrlFor(hit.url),
    snippet: hit.snippet,
  }));
}

export function relatedSearchesFor(query: string): string[] {
  const q = query.trim();
  if (!q) return [];
  return [`${q} tutorial`, `${q} examples`, `${q} documentation`, `best ${q} tools`];
}

export const EMPTY_SEARCH_RESULT: SearchQueryResult = {
  query: "",
  results: [],
  relatedSearches: [],
  knowledgePanel: null,
  resultCount: 0,
  elapsedMs: 0,
};
