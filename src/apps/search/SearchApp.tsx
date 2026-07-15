import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import {
  BrowserShell,
  SearchAttribution,
  SearchHome,
  SearchResultsPage,
} from "../../components/patterns/search";
import { useSearch } from "./useSearch";

export function SearchApp() {
  const vm = useSearch();

  if (vm.view === "browse") {
    return (
      <div className="arco-search-app">
        <BrowserShell
          url={vm.browseUrl}
          onNavigate={vm.setBrowseUrl}
          onFallbackBack={vm.goResults}
          placeholder={i18n.t(I18nKey.APPS$SEARCH_ADDRESS_BAR_EDIT_URL_OR_SEARCH_TERM)}
          title={i18n.t(I18nKey.APPS$SEARCH_SEARCH_RESULT_PREVIEW)}
          toolbarExtra={<SearchAttribution className="arco-search-app__attribution" />}
        />
      </div>
    );
  }

  if (vm.view === "results") {
    return (
      <SearchResultsPage
        query={vm.draft}
        onQueryChange={vm.setDraft}
        onSubmit={() => vm.submitInput()}
        onHome={vm.goHome}
        suggestions={vm.suggestions}
        showSuggestions={vm.showSuggestions}
        onSelectSuggestion={(s) => vm.selectSuggestion(s.text)}
        tabs={vm.tabs}
        activeTab={vm.activeTab}
        onTabChange={vm.setActiveTab}
        filters={vm.filters}
        filterValues={vm.filterValues}
        onFilterChange={vm.setFilter}
        results={vm.resultPack.results}
        relatedSearches={vm.resultPack.relatedSearches}
        onRelatedClick={vm.selectSuggestion}
        knowledgePanel={vm.resultPack.knowledgePanel}
        resultCount={vm.resultPack.resultCount}
        elapsedMs={vm.resultPack.elapsedMs}
        page={vm.page}
        totalPages={vm.totalPages}
        onPageChange={vm.setPage}
        onOpenResult={vm.openResult}
        loading={vm.loading}
        error={vm.error}
      />
    );
  }

  return (
    <SearchHome
      query={vm.draft}
      onQueryChange={vm.setDraft}
      onSubmit={() => vm.submitInput()}
      onLucky={vm.lucky}
      suggestions={vm.suggestions}
      showSuggestions={vm.showSuggestions}
      onSelectSuggestion={(s) => vm.selectSuggestion(s.text)}
      trending={vm.trending}
      onTrendingClick={vm.selectSuggestion}
    />
  );
}
