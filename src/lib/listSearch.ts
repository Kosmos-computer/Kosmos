import type { ReactNode } from "react";

/** Normalize a list-search query for case-insensitive matching. */
export function normalizeListSearch(query: string): string {
  return query.trim().toLowerCase();
}

/** True when query is empty or any part contains the query as a substring. */
export function matchesListSearch(query: string, ...parts: (string | undefined | null)[]): boolean {
  const normalized = normalizeListSearch(query);
  if (!normalized) return true;
  return parts.some((part) => part?.toLowerCase().includes(normalized));
}

/** Extract searchable text from a menu label (string or simple ReactNode). */
export function menuItemSearchText(label: ReactNode): string {
  if (typeof label === "string" || typeof label === "number") return String(label);
  return "";
}

export interface ListSearchableMenuItem {
  id: string;
  label: ReactNode;
  description?: string;
  /** Extra strings matched by menu search (e.g. when label is a React element). */
  keywords?: string[];
  disabled?: boolean;
  separatorAbove?: boolean;
}

/** Filter menu items by label text and optional keywords; disabled items without a match are hidden. */
export function filterMenuItems<T extends ListSearchableMenuItem>(items: T[], query: string): T[] {
  const normalized = normalizeListSearch(query);
  if (!normalized) return items;

  const filtered = items.filter(
    (item) =>
      !item.disabled &&
      matchesListSearch(
        normalized,
        menuItemSearchText(item.label),
        item.description,
        ...(item.keywords ?? []),
      ),
  );

  return filtered.map((item, index) => ({
    ...item,
    separatorAbove: index > 0 ? item.separatorAbove : false,
  }));
}

/** Whether a list is long enough to show a search field by default. */
export function shouldShowListSearch(count: number, minItems = 4): boolean {
  return count >= minItems;
}
