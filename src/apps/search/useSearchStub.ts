/**
 * STUB: replace with useSearchStore when os.search@1 exists.
 */
import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_SEARCH_FILTERS,
  DEFAULT_SEARCH_TABS,
  type SearchTabId,
} from "../../components/patterns/search";
import {
  buildSuggestions,
  luckyUrlForQuery,
  resolveSearchResults,
  SEARCH_TRENDING,
  type SearchView,
} from "./searchMock";

const DEFAULT_FILTER_VALUES = Object.fromEntries(
  DEFAULT_SEARCH_FILTERS.map((f) => [f.id, f.options[0]?.value ?? ""]),
);

/** STUB: replace with useSearchStore when os.search@1 exists. */
export function useSearchStub() {
  const [view, setView] = useState<SearchView>("home");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTabId>("all");
  const [filterValues, setFilterValues] = useState(DEFAULT_FILTER_VALUES);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<string[]>(["design tokens", "leaflet maps react"]);
  const [browseUrl, setBrowseUrl] = useState("");

  const suggestions = useMemo(() => buildSuggestions(draft, history), [draft, history]);
  const resultPack = useMemo(() => resolveSearchResults(query), [query]);
  const totalPages = Math.max(1, Math.ceil(resultPack.results.length / 5) || 1);

  const runSearch = useCallback(
    (term?: string) => {
      const next = (term ?? draft).trim();
      if (!next) return;
      setLoading(true);
      setShowSuggestions(false);
      setQuery(next);
      setDraft(next);
      setPage(1);
      setView("results");
      setHistory((h) => [next, ...h.filter((x) => x !== next)].slice(0, 12));
      window.setTimeout(() => setLoading(false), 320);
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
  }, []);

  const goResults = useCallback(() => {
    if (query) setView("results");
    else setView("home");
    setBrowseUrl("");
  }, [query]);

  const lucky = useCallback(() => {
    const url = luckyUrlForQuery(draft || query);
    openResult(url);
  }, [draft, query, openResult]);

  const setFilter = useCallback((filterId: string, value: string) => {
    setFilterValues((current) => ({ ...current, [filterId]: value }));
    setPage(1);
  }, []);

  const selectSuggestion = useCallback(
    (text: string) => {
      setDraft(text);
      runSearch(text);
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
    showSuggestions,
    setShowSuggestions,
    suggestions,
    resultPack,
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

export type SearchViewModel = ReturnType<typeof useSearchStub>;
