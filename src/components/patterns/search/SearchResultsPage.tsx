import { I18nKey } from "../../../i18n/declaration";
import i18n from "../../../i18n/index";
import { T } from "../../../i18n/T";
import { ArrowLeft, Settings2 } from "lucide-react";
import { Button } from "../../ui";
import type { SearchFilterDef, SearchKnowledgePanel, SearchResultItem, SearchSuggestion, SearchTabDef, SearchTabId } from "./searchTypes";
import { SearchAttribution } from "./SearchAttribution";
import { SearchBar } from "./SearchBar";
import { SearchFilters } from "./SearchFilters";
import { SearchKnowledgePanel as KnowledgePanel } from "./SearchKnowledgePanel";
import { SearchPagination } from "./SearchPagination";
import { SearchResultItem as ResultItem } from "./SearchResultItem";
import { SearchTabs } from "./SearchTabs";

export interface SearchResultsPageProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onHome: () => void;
  suggestions?: SearchSuggestion[];
  showSuggestions?: boolean;
  onSelectSuggestion?: (suggestion: SearchSuggestion) => void;
  tabs: SearchTabDef[];
  activeTab: SearchTabId;
  onTabChange: (tab: SearchTabId) => void;
  filters: SearchFilterDef[];
  filterValues: Record<string, string>;
  onFilterChange: (filterId: string, value: string) => void;
  results: SearchResultItem[];
  relatedSearches?: string[];
  onRelatedClick?: (term: string) => void;
  knowledgePanel?: SearchKnowledgePanel | null;
  resultCount?: number;
  elapsedMs?: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onOpenResult: (url: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function SearchResultsPage({
  query,
  onQueryChange,
  onSubmit,
  onHome,
  suggestions = [],
  showSuggestions = false,
  onSelectSuggestion,
  tabs,
  activeTab,
  onTabChange,
  filters,
  filterValues,
  onFilterChange,
  results,
  relatedSearches = [],
  onRelatedClick,
  knowledgePanel,
  resultCount,
  elapsedMs,
  page,
  totalPages,
  onPageChange,
  onOpenResult,
  loading = false,
  error = null,
}: SearchResultsPageProps) {
  return (
    <div className="arco-search-results">
      <header className="arco-search-results__header">
        <div className="arco-search-results__header-top">
          <button type="button" className="arco-search-results__logo" onClick={onHome} aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_SEARCH_HOME)}><T k={I18nKey.COMMON$SEARCH} /></button>
          <SearchBar
            variant="compact"
            value={query}
            onChange={onQueryChange}
            onSubmit={onSubmit}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            onSelectSuggestion={onSelectSuggestion}
          />
          <Button variant="ghost" className="arco-btn--icon" aria-label={i18n.t(I18nKey.APPS$SETTINGS_SEARCH_SETTINGS)}>
            <Settings2 size={18} />
          </Button>
        </div>
        <SearchTabs tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
        <SearchFilters filters={filters} values={filterValues} onChange={onFilterChange} />
      </header>

      <div className="arco-search-results__body">
        <main className="arco-search-results__main">
          <div className="arco-search-results__stats">
            {loading ? (
              <span><T k={I18nKey.COMPONENTS$PATTERNS_SEARCHING} /></span>
            ) : error ? (
              <span className="arco-search-results__error">{error}</span>
            ) : (
              <span><T k={I18nKey.COMPONENTS$PATTERNS_ABOUT} />{resultCount?.toLocaleString() ?? results.length.toLocaleString()}<T k={I18nKey.COMPONENTS$PATTERNS_RESULTS} />{elapsedMs != null ? ` (${(elapsedMs / 1000).toFixed(2)} seconds)` : ""}
              </span>
            )}
          </div>

          {loading ? (
            <div className="arco-search-results__loading">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="arco-search-results__skeleton" aria-hidden />
              ))}
            </div>
          ) : (
            <>
              <div className="arco-search-results__list">
                {results.map((result) => (
                  <ResultItem key={result.id} result={result} onOpen={onOpenResult} />
                ))}
              </div>

              {relatedSearches.length > 0 ? (
                <section className="arco-search-results__related" aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_RELATED_SEARCHES)}>
                  <h2><T k={I18nKey.COMPONENTS$PATTERNS_RELATED_SEARCHES} /></h2>
                  <ul>
                    {relatedSearches.map((term) => (
                      <li key={term}>
                        <button type="button" onClick={() => onRelatedClick?.(term)}>
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <SearchPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
            </>
          )}
        </main>

        {knowledgePanel ? (
          <KnowledgePanel panel={knowledgePanel} onRelatedClick={onRelatedClick} />
        ) : null}
      </div>

      <footer className="arco-search-results__footer">
        <Button variant="ghost" onClick={onHome}>
          <ArrowLeft size={14} aria-hidden /><T k={I18nKey.COMPONENTS$PATTERNS_BACK_TO_SEARCH_HOME} /></Button>
        <SearchAttribution />
      </footer>
    </div>
  );
}
