import { I18nKey } from "../../../i18n/declaration";
import i18n from "../../../i18n/index";
import { T } from "../../../i18n/T";
import { useTranslation } from "react-i18next";
export interface SearchPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function SearchPagination({ page, totalPages, onPageChange }: SearchPaginationProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1);

  return (
    <nav className="arco-search-pagination" aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_SEARCH_RESULTS_PAGES)}>
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><T k={I18nKey.COMMON$PREVIOUS} /></button>
      <ol>
        {pages.map((n) => (
          <li key={n}>
            <button
              type="button"
              className={n === page ? "arco-search-pagination__page--active" : undefined}
              aria-current={n === page ? "page" : undefined}
              onClick={() => onPageChange(n)}
            >
              {n}
            </button>
          </li>
        ))}
      </ol>
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}><T k={I18nKey.COMMON$NEXT} /></button>
    </nav>
  );
}
