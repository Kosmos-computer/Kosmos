import { I18nKey } from "../../../i18n/declaration";
import i18n from "../../../i18n/index";
import type { SearchFilterDef } from "./searchTypes";

export interface SearchFiltersProps {
  filters: SearchFilterDef[];
  values: Record<string, string>;
  onChange: (filterId: string, value: string) => void;
}

export function SearchFilters({ filters, values, onChange }: SearchFiltersProps) {
  return (
    <div className="arco-search-filters" aria-label={i18n.t(I18nKey.COMPONENTS$PATTERNS_SEARCH_FILTERS)}>
      {filters.map((filter) => (
        <label key={filter.id} className="arco-search-filters__item">
          <span className="arco-search-filters__label">{filter.label}</span>
          <select
            className="arco-search-filters__select"
            value={values[filter.id] ?? filter.options[0]?.value ?? ""}
            onChange={(e) => onChange(filter.id, e.target.value)}
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

export const DEFAULT_SEARCH_FILTERS: SearchFilterDef[] = [
  {
    id: "time",
    label: "Any time",
    options: [
      { value: "any", label: "Any time" },
      { value: "day", label: "Past 24 hours" },
      { value: "week", label: "Past week" },
      { value: "month", label: "Past month" },
      { value: "year", label: "Past year" },
    ],
  },
  {
    id: "type",
    label: "All results",
    options: [
      { value: "all", label: "All results" },
      { value: "verbatim", label: "Verbatim" },
    ],
  },
  {
    id: "region",
    label: "Region",
    options: [
      { value: "any", label: "Any region" },
      { value: "us", label: "United States" },
      { value: "eu", label: "Europe" },
    ],
  },
];
