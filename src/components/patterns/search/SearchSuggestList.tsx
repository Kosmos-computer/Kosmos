import { I18nKey } from "../../../i18n/declaration";
import i18n from "../../../i18n/index";
import { Clock, Search, TrendingUp } from "lucide-react";
import type { SearchSuggestion } from "./searchTypes";
import { useTranslation } from "react-i18next";

export interface SearchSuggestListProps {
  suggestions: SearchSuggestion[];
  onSelect: (suggestion: SearchSuggestion) => void;
}

export function SearchSuggestList({ suggestions, onSelect }: SearchSuggestListProps) {
  const { t } = useTranslation();
  return (
    <ul className="arco-search-suggest" role="listbox" aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_SEARCH_SUGGESTIONS)}>
      {suggestions.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className="arco-search-suggest__item"
            role="option"
            onClick={() => onSelect(item)}
          >
            {item.hint === "Trending" ? (
              <TrendingUp size={14} className="arco-icon--tertiary" aria-hidden />
            ) : item.hint === "Recent" ? (
              <Clock size={14} className="arco-icon--tertiary" aria-hidden />
            ) : (
              <Search size={14} className="arco-icon--tertiary" aria-hidden />
            )}
            <span className="arco-search-suggest__text">{item.text}</span>
            {item.hint ? <span className="arco-search-suggest__hint">{item.hint}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
