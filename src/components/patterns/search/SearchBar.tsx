import { Mic, X } from "lucide-react";
import { Button } from "../../ui";
import { BrowserAddressBar } from "./BrowserAddressBar";
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
  placeholder = "Search or enter a URL",
  variant = "compact",
  suggestions = [],
  onSelectSuggestion,
  showSuggestions = false,
  autoFocus = false,
  showHomeActions = false,
  onLucky,
  ariaLabel = "Search or enter a URL",
}: SearchBarProps) {
  const isHome = variant === "home";
  const secure = looksLikeSecureQuery(value);

  return (
    <div
      className={`arco-search-bar arco-search-bar--${variant}${showSuggestions && suggestions.length ? " arco-search-bar--open" : ""}`}
      role="search"
    >
      <div className="arco-search-bar__chrome">
        <BrowserAddressBar
          variant={variant}
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder={placeholder}
          showNav={false}
          secure={secure}
          ariaLabel={ariaLabel}
          autoFocus={autoFocus}
          toolbarExtra={
            <>
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
            </>
          }
        />
      </div>

      {showSuggestions && suggestions.length > 0 ? (
        <SearchSuggestList
          suggestions={suggestions}
          onSelect={(s) => onSelectSuggestion?.(s)}
        />
      ) : null}

      {isHome && showHomeActions ? (
        <div className="arco-search-bar__home-actions">
          <Button onClick={onSubmit}>Search</Button>
          <Button onClick={onLucky}>I&apos;m Feeling Lucky</Button>
        </div>
      ) : null}
    </div>
  );
}

function looksLikeSecureQuery(value: string): boolean {
  const t = value.trim();
  if (!t) return true;
  return /^https:\/\//i.test(t);
}
