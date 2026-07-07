import type {
  SearchKnowledgePanel,
  SearchResultItem,
  SearchSuggestion,
  SearchTabId,
} from "../../components/patterns/search";

export type SearchView = "home" | "results" | "browse";

export interface SearchQueryResult {
  query: string;
  results: SearchResultItem[];
  relatedSearches: string[];
  knowledgePanel: SearchKnowledgePanel | null;
  resultCount: number;
  elapsedMs: number;
}

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

const RESULT_PACKS: Record<string, SearchQueryResult> = {
  arco: {
    query: "Arco OS",
    resultCount: 1240000,
    elapsedMs: 0.42,
    relatedSearches: ["Arco prototype", "Arco design tokens", "Arco chat app", "Arco studio browser"],
    knowledgePanel: {
      title: "Arco",
      subtitle: "Personal AI workspace",
      summary:
        "Arco is an experimental desktop operating environment that combines chat, studio tooling, and installable apps in a unified shell with a token-driven design system.",
      facts: [
        { label: "Type", value: "Desktop shell / OS prototype" },
        { label: "Stack", value: "React, Zustand, Electron" },
        { label: "Design", value: "Arco token system (--arco-*)" },
      ],
      related: ["Arco Chat", "Arco Studio", "Open standards map"],
    },
    results: [
      {
        id: "r1",
        title: "Arco Prototype — GitHub",
        displayUrl: "github.com › openartist › arco-prototype",
        url: "https://github.com/",
        snippet:
          "Arco Prototype is a local-first AI workspace with a composable app shell, generative UI blocks, and a browser-based studio for building projects.",
        sitelinks: [
          { label: "Documentation", url: "https://github.com/" },
          { label: "Issues", url: "https://github.com/" },
          { label: "Releases", url: "https://github.com/" },
        ],
      },
      {
        id: "r2",
        title: "Design tokens reference — Arco Docs",
        displayUrl: "arco.dev › reference › tokens",
        url: "https://example.com/tokens",
        snippet:
          "Every shell surface references --arco-* CSS variables for typography, spacing, radii, and semantic colors. Themes switch on html[data-theme].",
        date: "Mar 2026",
      },
      {
        id: "r3",
        title: "Layout patterns — MasterDetail, Section, Toolbar",
        displayUrl: "arco.dev › guide › layout-patterns",
        url: "https://example.com/layout",
        snippet:
          "Arco composes apps from reusable patterns under src/components/patterns/ and ui primitives under src/components/ui/.",
      },
      {
        id: "r4",
        title: "Studio Browser tab — preview dev servers in-shell",
        displayUrl: "arco.dev › studio › browser",
        url: "https://example.com/browser",
        snippet:
          "Run npm scripts from the runs strip, enter a localhost port or URL, and preview the app in an iframe without leaving Arco.",
        date: "Feb 2026",
      },
      {
        id: "r5",
        title: "Open standards map",
        displayUrl: "arco.dev › reference › standards-map",
        url: "https://example.com/standards",
        snippet: "How Arco maps OS capabilities, installed apps, and generative blocks to open interfaces.",
      },
    ],
  },
  design: {
    query: "design system pattern kit",
    resultCount: 892000,
    elapsedMs: 0.38,
    relatedSearches: ["BEM naming", "design tokens", "component tiers", "pattern library"],
    knowledgePanel: {
      title: "Design system",
      summary:
        "A design system is a collection of reusable components, guided by clear standards, that can be assembled to build any number of applications.",
      facts: [
        { label: "Includes", value: "Tokens, primitives, patterns, documentation" },
        { label: "Benefit", value: "Consistency and faster UI delivery" },
      ],
      related: ["Atomic design", "Storybook", "Figma variables"],
    },
    results: [
      {
        id: "d1",
        title: "Building a search UI pattern kit — Arco Patterns",
        displayUrl: "arco.dev › patterns › search",
        url: "https://example.com/search-patterns",
        snippet:
          "SearchHome, SearchResultsPage, SearchBar, and BrowserShell compose a Google/Bing-style experience on top of the Arco browser iframe.",
        date: "Jul 2026",
      },
      {
        id: "d2",
        title: "Component tiers — primitives vs patterns vs apps",
        displayUrl: "arco.dev › reference › component-tiers",
        url: "https://example.com/tiers",
        snippet: "ui/ holds atoms; patterns/ holds layouts; apps/ compose domain surfaces.",
      },
      {
        id: "d3",
        title: "Google Material Design — Search patterns",
        displayUrl: "material.io › components › search",
        url: "https://m3.material.io/",
        snippet: "Guidance for search bars, result lists, and empty states in product UIs.",
      },
    ],
  },
};

const DEFAULT_PACK: SearchQueryResult = {
  query: "",
  resultCount: 4200000,
  elapsedMs: 0.51,
  relatedSearches: ["Arco OS", "React desktop shell", "local AI assistant", "pattern library"],
  knowledgePanel: null,
  results: [
    {
      id: "x1",
      title: "Search — pattern kit demo",
      displayUrl: "search.arco.local › demo",
      url: "https://example.com/",
      snippet:
        "This stub search engine demonstrates home, SERP, and in-shell browsing using mock data. Wire os.search@1 later for real retrieval.",
    },
    {
      id: "x2",
      title: "Wikipedia — Search engine",
      displayUrl: "en.wikipedia.org › wiki › Search_engine",
      url: "https://en.wikipedia.org/wiki/Search_engine",
      snippet:
        "A search engine is an information retrieval system designed to help find information stored on computer systems.",
      date: "Updated weekly",
    },
    {
      id: "x3",
      title: "MDN — HTML search element",
      displayUrl: "developer.mozilla.org › search",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/search",
      snippet: "The search element represents a part of a document that contains a form for searching.",
    },
    {
      id: "x4",
      title: "Bing Webmaster Guidelines",
      displayUrl: "bing.com › webmasters › guidelines",
      url: "https://www.bing.com/webmasters/help/webmasters-guidelines-30fba23a",
      snippet: "Best practices for how content appears in Bing search results.",
    },
  ],
};

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

export function resolveSearchResults(query: string): SearchQueryResult {
  const q = query.trim().toLowerCase();
  if (!q) return { ...DEFAULT_PACK, query: "" };

  if (q.includes("arco") || q.includes("prototype") || q.includes("os")) {
    return { ...RESULT_PACKS.arco, query: query.trim() };
  }
  if (q.includes("design") || q.includes("token") || q.includes("pattern")) {
    return { ...RESULT_PACKS.design, query: query.trim() };
  }

  return {
    ...DEFAULT_PACK,
    query: query.trim(),
    results: DEFAULT_PACK.results.map((r, i) => ({
      ...r,
      id: `gen-${i}`,
      title: r.title.includes("demo") ? `${query.trim()} — search demo` : r.title,
      snippet: r.snippet.replace("stub search", `results for "${query.trim()}"`),
    })),
    relatedSearches: [
      `${query.trim()} tutorial`,
      `${query.trim()} examples`,
      `${query.trim()} documentation`,
      `best ${query.trim()} tools`,
    ],
  };
}

export function luckyUrlForQuery(query: string): string {
  const pack = resolveSearchResults(query);
  return pack.results[0]?.url ?? "https://example.com/";
}
