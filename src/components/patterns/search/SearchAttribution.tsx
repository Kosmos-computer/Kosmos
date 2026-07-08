import { I18nKey } from "../../../i18n/declaration";
import { T } from "../../../i18n/T";
export interface SearchAttributionProps {
  className?: string;
}

export function SearchAttribution({ className = "" }: SearchAttributionProps) {
  return (
    <p className={`arco-search-attribution${className ? ` ${className}` : ""}`}><T k={I18nKey.COMPONENTS$PATTERNS_POWERED_BY} />{" "}
      <a href="https://duckduckgo.com/" target="_blank" rel="noopener noreferrer"><T k={I18nKey.COMPONENTS$PATTERNS_DUCKDUCKGO} /></a>
    </p>
  );
}
