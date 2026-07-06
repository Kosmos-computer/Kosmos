import type { CatalogItem, GeneratorResult } from "./types";

function titleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "Generated UI";
  return trimmed
    .split(/\s+/)
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function matches(prompt: string, keywords: string[]): boolean {
  const normalized = prompt.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

/** STUB: replace with real LLM / block registry generation. */
export function generateFromPrompt(prompt: string): GeneratorResult {
  if (matches(prompt, ["login", "sign in", "password"])) {
    return {
      title: titleFromPrompt(prompt) || "Login Form",
      preview: "login-form",
      schema: JSON.stringify({ kind: "login-form", fields: ["email", "password", "remember"] }, null, 2),
    };
  }
  if (matches(prompt, ["pricing", "plan", "subscription", "pro"])) {
    return {
      title: titleFromPrompt(prompt) || "Pricing Card",
      preview: "pricing",
      schema: JSON.stringify({ kind: "pricing-card", plan: "Pro", price: "$29/mo" }, null, 2),
    };
  }
  if (matches(prompt, ["contact", "message", "support"])) {
    return {
      title: titleFromPrompt(prompt) || "Contact Form",
      preview: "contact-form",
      schema: JSON.stringify({ kind: "contact-form", fields: ["name", "email", "message"] }, null, 2),
    };
  }
  return {
    title: titleFromPrompt(prompt) || "Generated UI",
    preview: "card",
    schema: JSON.stringify({ kind: "card", title: titleFromPrompt(prompt) }, null, 2),
  };
}

export function resultFromCatalog(item: CatalogItem): GeneratorResult {
  return {
    title: item.label,
    preview: item.preview,
    schema: JSON.stringify({ catalogId: item.id, tier: item.tier, preview: item.preview }, null, 2),
  };
}
