import { ChevronRight } from "lucide-react";
import type { SearchResultItem as SearchResultItemType } from "./searchTypes";

export interface SearchResultItemProps {
  result: SearchResultItemType;
  onOpen: (url: string) => void;
}

export function SearchResultItem({ result, onOpen }: SearchResultItemProps) {
  return (
    <article className="arco-search-result">
      <div className="arco-search-result__meta">
        <span className="arco-search-result__favicon" aria-hidden />
        <button type="button" className="arco-search-result__url" onClick={() => onOpen(result.url)}>
          {result.displayUrl}
        </button>
        {result.date ? <span className="arco-search-result__date">{result.date}</span> : null}
      </div>
      <h3 className="arco-search-result__title">
        <button type="button" onClick={() => onOpen(result.url)}>
          {result.title}
        </button>
      </h3>
      <p className="arco-search-result__snippet">{result.snippet}</p>
      {result.sitelinks && result.sitelinks.length > 0 ? (
        <ul className="arco-search-result__sitelinks">
          {result.sitelinks.map((link) => (
            <li key={link.url}>
              <button type="button" onClick={() => onOpen(link.url)}>
                {link.label}
                <ChevronRight size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
