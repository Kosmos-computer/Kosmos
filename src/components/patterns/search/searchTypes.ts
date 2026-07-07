/** Shared types for the search UI pattern kit. */

export type SearchTabId = "all" | "web" | "images" | "news" | "videos" | "maps";

export interface SearchTabDef {
  id: SearchTabId;
  label: string;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  /** Optional trailing hint — e.g. "Trending" or a category. */
  hint?: string;
}

export interface SearchSitelink {
  label: string;
  url: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  url: string;
  displayUrl: string;
  snippet: string;
  date?: string;
  sitelinks?: SearchSitelink[];
}

export interface SearchKnowledgeFact {
  label: string;
  value: string;
}

export interface SearchKnowledgePanel {
  title: string;
  subtitle?: string;
  summary: string;
  imageUrl?: string;
  facts?: SearchKnowledgeFact[];
  related?: string[];
}

export interface SearchFilterDef {
  id: string;
  label: string;
  options: { value: string; label: string }[];
}
