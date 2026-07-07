import type { SearchSuggestion } from "../../components/patterns/search";

export type SearchView = "home" | "results" | "browse";

export const SEARCH_TRENDING = [
  "design system tokens",
  "local-first AI workspace",
  "OpenStreetMap routing API",
  "generative UI blocks",
  "Electron multi-window apps",
  "React pattern libraries 2026",
];

export const SEARCH_SUGGESTIONS: SearchSuggestion[] = [
  { id: "s1", text: "design tokens css variables", hint: "Trending" },
  { id: "s2", text: "how to build a search engine ui", hint: "Trending" },
  { id: "s3", text: "leaflet openstreetmap react", hint: "Recent" },
  { id: "s4", text: "zustand window manager pattern" },
  { id: "s5", text: "vite electron monorepo setup" },
];

export function buildSuggestions(query: string, history: string[]): SearchSuggestion[] {
  const q = query.trim().toLowerCase();
  const fromHistory = history
    .filter((h) => !q || h.toLowerCase().includes(q))
    .slice(0, 3)
    .map((text, i) => ({ id: `hist-${i}`, text, hint: "Recent" as const }));

  const fromCatalog = SEARCH_SUGGESTIONS.filter(
    (s) => !q || s.text.toLowerCase().includes(q),
  ).slice(0, 6 - fromHistory.length);

  return [...fromHistory, ...fromCatalog].slice(0, 8);
}
