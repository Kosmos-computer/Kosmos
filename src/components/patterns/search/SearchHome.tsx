import { I18nKey } from "../../../i18n/declaration";
import i18n from "../../../i18n/index";
import { T } from "../../../i18n/T";
import type { SearchSuggestion } from "./searchTypes";
import { SearchAttribution } from "./SearchAttribution";
import { SearchBar } from "./SearchBar";

export interface SearchHomeProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onLucky?: () => void;
  suggestions?: SearchSuggestion[];
  showSuggestions?: boolean;
  onSelectSuggestion?: (suggestion: SearchSuggestion) => void;
  trending?: string[];
  onTrendingClick?: (term: string) => void;
}

export function SearchHome({
  query,
  onQueryChange,
  onSubmit,
  onLucky,
  suggestions = [],
  showSuggestions = false,
  onSelectSuggestion,
  trending = [],
  onTrendingClick,
}: SearchHomeProps) {
  return (
    <div className="arco-search-home">
      <div className="arco-search-home__center">
        <h1 className="arco-search-home__logo"><T k={I18nKey.COMMON$SEARCH} /></h1>

        <SearchBar
          variant="home"
          value={query}
          onChange={onQueryChange}
          onSubmit={onSubmit}
          onLucky={onLucky}
          showHomeActions
          suggestions={suggestions}
          showSuggestions={showSuggestions}
          onSelectSuggestion={onSelectSuggestion}
          autoFocus
        />
      </div>

      {trending.length > 0 ? (
        <section className="arco-search-home__trending" aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_TRENDING_SEARCHES)}>
          <h2><T k={I18nKey.COMPONENTS$PATTERNS_TRENDING} /></h2>
          <ul>
            {trending.map((term) => (
              <li key={term}>
                <button type="button" onClick={() => onTrendingClick?.(term)}>
                  {term}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SearchAttribution />
    </div>
  );
}
