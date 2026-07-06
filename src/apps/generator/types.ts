export type CatalogTier = "atom" | "card" | "block" | "widget";

export interface CatalogItem {
  id: string;
  label: string;
  tier: CatalogTier;
  preview: "button-primary" | "button-secondary" | "input" | "card" | "empty" | "pricing" | "contact-form" | "login-form";
}

export type GeneratorPreviewTab = "preview" | "schema";

export interface GeneratorResult {
  title: string;
  preview: CatalogItem["preview"];
  schema: string;
}

export interface GeneratorWorkspaceData {
  examplePrompts: string[];
  defaultPrompt: string;
}
