import type { GeneratorCatalogTier } from "@shared/types";

export type CatalogTier = GeneratorCatalogTier;

export type CatalogSource = "builtin" | "example" | "saved" | "generated";

export interface CatalogItem {
  id: string;
  label: string;
  tier: CatalogTier;
  /** openui-lang program rendered in the preview pane. */
  code: string;
  source: CatalogSource;
  familyLabel?: string;
  prompt?: string;
  createdAt?: string;
}

export type GeneratorPreviewTab = "preview" | "schema";

export interface GeneratorResult {
  title: string;
  code: string;
  source: CatalogSource;
  catalogId?: string;
  tier?: CatalogTier;
  validation?: "ok" | "warn";
  lintSummary?: string;
}

export interface GeneratorWorkspaceData {
  examplePrompts: string[];
  defaultPrompt: string;
}

export const GENERATOR_DATA: GeneratorWorkspaceData = {
  defaultPrompt: "A contact form with name, email, message, and submit",
  examplePrompts: [
    "A pricing card for a Pro plan with features and a CTA button",
    "A login form with email, password, remember me toggle, and sign in",
    "A contact form with name, email, message, and submit",
    "A dashboard card with a bar chart of weekly signups",
    "A newsletter signup card with a heading, email field, and subscribe button",
  ],
};
