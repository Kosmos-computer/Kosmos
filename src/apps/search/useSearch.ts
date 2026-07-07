import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_SEARCH_FILTERS,
  DEFAULT_SEARCH_TABS,
  type SearchTabId,
} from "../../components/patterns/search";
import {
  EMPTY_SEARCH_RESULT,
  mapWebResults,
  relatedSearchesFor,
  searchWeb,
  type SearchQueryResult,
} from "./searchApi";
import { buildSuggestions, SEARCH_TRENDING, type SearchView } from "./searchMock";

const PAGE_SIZE = 10;

const DEFAULT_FILTER_VALUES = Object.fromEntries(
  DEFAULT_SEARCH_FILTERS.map((f) => [f.id, f.options[0]?.value ?? ""]),
);

/** Web search backed by /api/search/web (DuckDuckGo HTML proxy). */
export function useSearch() {
  const [view, setView] = useState<SearchView>("home");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTabId>("all");
  const [filterValues, setFilterValues] = useState(DEFAULT_FILTER_VALUES);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [browseUrl, setBrowseUrl] = useState("");
  const [resultPack, setResultPack] = useState<SearchQueryResult>(EMPTY_SEARCH_RESULT);

  const suggestions = useMemo(() => buildSuggestions(draft, history), [draft, history]);
  const totalPages = Math.max(1, Math.ceil(resultPack.results.length / PAGE_SIZE) || 1);
  const pagedResults = useMemo(
    () => resultPack.results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, resultPack.results],
  );

  const runSearch = useCallback(
    async (term?: string) => {
      const next = (term ?? draft).trim();
      if (!next) return;
      setLoading(true);
      setError(null);
      setShowSuggestions(false);
      setQuery(next);
      setDraft(next);
      setPage(1);
      setView("results");
      setHistory((h) => [next, ...h.filter((x) => x !== next)].slice(0, 12));
      try {
        const response = await searchWeb(next, { limit: 20 });
        setResultPack({
          query: response.query,
          results: mapWebResults(response.results),
          relatedSearches: relatedSearchesFor(response.query),
          knowledgePanel: null,
          resultCount: response.resultCount,
          elapsedMs: response.elapsedMs,
        });
        if (response.results.length === 0) {
          setError("No results — try different keywords.");
        }
      } catch (err) {
        setResultPack({ ...EMPTY_SEARCH_RESULT, query: next });
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    },
    [draft],
  );

  const openResult = useCallback((url: string) => {
    setBrowseUrl(url);
    setView("browse");
  }, []);

  const goHome = useCallback(() => {
    setView("home");
    setShowSuggestions(false);
    setBrowseUrl("");
    setError(null);
  }, []);

  const goResults = useCallback(() => {
    if (query) setView("results");
    else setView("home");
    setBrowseUrl("");
  }, [query]);

  const lucky = useCallback(async () => {
    const term = (draft || query).trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    try {
      const response = await searchWeb(term, { limit: 1 });
      const url = response.results[0]?.url;
      if (url) {
        openResult(url);
        return;
      }
      setError("No results — try different keywords.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [draft, query, openResult]);

  const setFilter = useCallback((filterId: string, value: string) => {
    setFilterValues((current) => ({ ...current, [filterId]: value }));
    setPage(1);
  }, []);

  const selectSuggestion = useCallback(
    (text: string) => {
      setDraft(text);
      void runSearch(text);
    },
    [runSearch],
  );

  return {
    view,
    query,
    draft,
    setDraft: (value: string) => {
      setDraft(value);
      setShowSuggestions(true);
    },
    activeTab,
    setActiveTab,
    filterValues,
    setFilter,
    page,
    setPage,
    loading,
    error,
    showSuggestions,
    setShowSuggestions,
    suggestions,
    resultPack: {
      ...resultPack,
      results: pagedResults,
    },
    totalPages,
    tabs: DEFAULT_SEARCH_TABS,
    filters: DEFAULT_SEARCH_FILTERS,
    trending: SEARCH_TRENDING,
    history,
    browseUrl,
    setBrowseUrl,
    runSearch,
    openResult,
    goHome,
    goResults,
    lucky,
    selectSuggestion,
  };
}

export type SearchViewModel = ReturnType<typeof useSearch>;
