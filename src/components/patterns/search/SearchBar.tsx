import { Mic, Search, X } from "lucide-react";
import { Button } from "../../ui";
import { SearchSuggestList } from "./SearchSuggestList";
import type { SearchSuggestion } from "./searchTypes";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  /** Large centered variant for the home page. */
  variant?: "home" | "compact";
  suggestions?: SearchSuggestion[];
  onSelectSuggestion?: (suggestion: SearchSuggestion) => void;
  showSuggestions?: boolean;
  autoFocus?: boolean;
  /** Show voice and lucky affordances on the home variant. */
  showHomeActions?: boolean;
  onLucky?: () => void;
  ariaLabel?: string;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search the web",
  variant = "compact",
  suggestions = [],
  onSelectSuggestion,
  showSuggestions = false,
  autoFocus = false,
  showHomeActions = false,
  onLucky,
  ariaLabel = "Search",
}: SearchBarProps) {
  const isHome = variant === "home";

  return (
    <div
      className={`arco-search-bar arco-search-bar--${variant}${showSuggestions && suggestions.length ? " arco-search-bar--open" : ""}`}
      role="search"
    >
      <div className="arco-search-bar__field">
        <Search size={isHome ? 20 : 16} className="arco-search-bar__icon" aria-hidden />
        <input
          className="arco-search-bar__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
        />
        {value ? (
          <Button
            variant="ghost"
            className="arco-btn--icon arco-search-bar__clear"
            aria-label="Clear search"
            onClick={() => onChange("")}
          >
            <X size={16} />
          </Button>
        ) : null}
        <Button variant="ghost" className="arco-btn--icon arco-search-bar__mic" aria-label="Voice search">
          <Mic size={16} />
        </Button>
      </div>

      {showSuggestions && suggestions.length > 0 ? (
        <SearchSuggestList
          suggestions={suggestions}
          onSelect={(s) => onSelectSuggestion?.(s)}
        />
      ) : null}

      {isHome && showHomeActions ? (
        <div className="arco-search-bar__home-actions">
          <Button onClick={onSubmit}>
            Search
          </Button>
          <Button onClick={onLucky}>
            I&apos;m Feeling Lucky
          </Button>
        </div>
      ) : null}
    </div>
  );
}
