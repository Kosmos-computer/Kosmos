import { ArrowLeft } from "lucide-react";
import {
  BrowserShell,
  SearchHome,
  SearchResultsPage,
} from "../../components/patterns/search";
import { Button } from "../../components/ui";
import { useSearchStub } from "./useSearchStub";

export function SearchApp() {
  const vm = useSearchStub();

  if (vm.view === "browse") {
    return (
      <div className="arco-search-app">
        <div className="arco-search-app__browse-bar">
          <Button variant="ghost" onClick={vm.goResults}>
            <ArrowLeft size={14} aria-hidden />
            Back to results
          </Button>
          <Button variant="ghost" onClick={vm.goHome}>
            Search home
          </Button>
        </div>
        <BrowserShell
          url={vm.browseUrl}
          onNavigate={vm.setBrowseUrl}
          placeholder="Address bar — edit URL or search term"
          title="Search result preview"
        />
      </div>
    );
  }

  if (vm.view === "results") {
    return (
      <SearchResultsPage
        query={vm.draft}
        onQueryChange={vm.setDraft}
        onSubmit={() => vm.runSearch()}
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
      />
    );
  }

  return (
    <SearchHome
      query={vm.draft}
      onQueryChange={vm.setDraft}
      onSubmit={() => vm.runSearch()}
      onLucky={vm.lucky}
      suggestions={vm.suggestions}
      showSuggestions={vm.showSuggestions}
      onSelectSuggestion={(s) => vm.selectSuggestion(s.text)}
      trending={vm.trending}
      onTrendingClick={vm.selectSuggestion}
    />
  );
}
