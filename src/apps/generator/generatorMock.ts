import type { CatalogItem, GeneratorWorkspaceData } from "./types";

export const GENERATOR_CATALOG: CatalogItem[] = [
  { id: "btn-primary", label: "Button · primary", tier: "atom", preview: "button-primary" },
  { id: "btn-secondary", label: "Button · secondary", tier: "atom", preview: "button-secondary" },
  { id: "input", label: "Input", tier: "atom", preview: "input" },
  { id: "card", label: "Card", tier: "card", preview: "card" },
  { id: "empty", label: "Empty state", tier: "atom", preview: "empty" },
  { id: "pricing", label: "Pricing card", tier: "block", preview: "pricing" },
  { id: "contact-form", label: "Contact form", tier: "block", preview: "contact-form" },
  { id: "login-form", label: "Login form", tier: "block", preview: "login-form" },
];

export const GENERATOR_DATA: GeneratorWorkspaceData = {
  defaultPrompt: "A contact form with name, email, message, and submit",
  examplePrompts: [
    "A pricing card for a Pro plan with features and a CTA button",
    "A login form with email, password, remember me toggle, and sign in",
    "A contact form with name, email, message, and submit",
    "A product card for wireless headphones with price and add to cart",
    "A newsletter signup card with a heading, email field, and subscribe button",
  ],
};
