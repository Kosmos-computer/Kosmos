/**
 * Bento card theme catalog — translated from Longformer UI Experiments shell
 * primitives (DesignCardShell, GlassWidgetShell, StatCard, Finance/Banking/Fitness).
 *
 * Themes apply via `data-bento-theme` on the tile; styles live in bento-themes.css.
 */

export type BentoThemeGroup = "surface" | "glass" | "design" | "stat" | "finance" | "banking" | "fitness";

export type BentoCardThemeId =
  | "surface-default"
  | "surface-sunken"
  | "surface-accent-soft"
  | "glass-dark"
  | "glass-light"
  | "design-dark"
  | "design-light"
  | "design-blue"
  | "design-red"
  | "design-green"
  | "design-purple"
  | "stat-neutral"
  | "stat-accent"
  | "stat-success"
  | "stat-warning"
  | "finance-dark"
  | "finance-lime"
  | "finance-lavender"
  | "finance-white"
  | "banking-purple"
  | "banking-lime"
  | "banking-black"
  | "banking-white"
  | "banking-chamfer"
  | "fitness-dark"
  | "fitness-pink";

export interface BentoCardTheme {
  id: BentoCardThemeId;
  label: string;
  group: BentoThemeGroup;
  /** Longformer source primitive for traceability. */
  source: string;
  description: string;
  /** Swatch colors for the theme picker preview chip. */
  swatch: [string, string];
}

export const BENTO_THEME_GROUPS: { id: BentoThemeGroup; label: string }[] = [
  { id: "surface", label: "Surface" },
  { id: "glass", label: "Glass" },
  { id: "design", label: "Design cards" },
  { id: "stat", label: "Stat KPI" },
  { id: "finance", label: "Finance" },
  { id: "banking", label: "Banking" },
  { id: "fitness", label: "Fitness" },
];

/** All selectable card themes, grouped for the settings modal picker. */
export const BENTO_CARD_THEMES: BentoCardTheme[] = [
  {
    id: "surface-default",
    label: "Default",
    group: "surface",
    source: "Arco shell",
    description: "Standard elevated surface — matches the default bento tile.",
    swatch: ["#181b22", "#eef1f6"],
  },
  {
    id: "surface-sunken",
    label: "Sunken",
    group: "surface",
    source: "InsightCard",
    description: "Inset panel with subtle border — dashboard insight cards.",
    swatch: ["#12151c", "#6d7585"],
  },
  {
    id: "surface-accent-soft",
    label: "Accent glow",
    group: "surface",
    source: "Bento insight",
    description: "Soft accent gradient wash for highlight widgets.",
    swatch: ["#1a2238", "#7c9dff"],
  },
  {
    id: "glass-dark",
    label: "Glass dark",
    group: "glass",
    source: "GlassWidgetShell",
    description: "Frosted dark glass with blur and inset highlight.",
    swatch: ["#0c0c0e", "#ffffff"],
  },
  {
    id: "glass-light",
    label: "Glass light",
    group: "glass",
    source: "GlassWidgetShell",
    description: "Bright frosted glass — iOS-style widget chrome.",
    swatch: ["#ffffff", "#111111"],
  },
  {
    id: "design-dark",
    label: "Island dark",
    group: "design",
    source: "DesignCardShell",
    description: "Pure black Dynamic Island pill with soft inner glow.",
    swatch: ["#000000", "#ffffff"],
  },
  {
    id: "design-light",
    label: "Island light",
    group: "design",
    source: "DesignCardShell",
    description: "Light gray pill — Apple widget light mode.",
    swatch: ["#f5f5f7", "#111111"],
  },
  {
    id: "design-blue",
    label: "Blue gradient",
    group: "design",
    source: "DesignCardShell",
    description: "Bold blue gradient live-activity shell.",
    swatch: ["#2563eb", "#ffffff"],
  },
  {
    id: "design-red",
    label: "Red gradient",
    group: "design",
    source: "DesignCardShell",
    description: "Deep red gradient for alerts and urgency.",
    swatch: ["#7f1d1d", "#ffffff"],
  },
  {
    id: "design-green",
    label: "Green gradient",
    group: "design",
    source: "DesignCardShell",
    description: "Forest green fade to black — health and nature widgets.",
    swatch: ["#14532d", "#ffffff"],
  },
  {
    id: "design-purple",
    label: "Purple gradient",
    group: "design",
    source: "DesignCardShell",
    description: "Indigo-purple fade — creative and media widgets.",
    swatch: ["#312e81", "#ffffff"],
  },
  {
    id: "stat-neutral",
    label: "Neutral stat",
    group: "stat",
    source: "StatCard",
    description: "Muted surface with accent data highlights.",
    swatch: ["#262834", "#eef1f6"],
  },
  {
    id: "stat-accent",
    label: "Accent fill",
    group: "stat",
    source: "StatCard",
    description: "Full accent background with on-accent typography.",
    swatch: ["#7c9dff", "#ffffff"],
  },
  {
    id: "stat-success",
    label: "Success fill",
    group: "stat",
    source: "StatCard",
    description: "Green KPI card for positive metrics.",
    swatch: ["#58c98b", "#ffffff"],
  },
  {
    id: "stat-warning",
    label: "Warning fill",
    group: "stat",
    source: "StatCard",
    description: "Amber KPI card for caution metrics.",
    swatch: ["#e5b567", "#ffffff"],
  },
  {
    id: "finance-dark",
    label: "Finance dark",
    group: "finance",
    source: "FinanceWidgetShell",
    description: "Dark trading terminal surface.",
    swatch: ["#171717", "#ffffff"],
  },
  {
    id: "finance-lime",
    label: "Finance lime",
    group: "finance",
    source: "FinanceWidgetShell",
    description: "High-contrast lime finance widget.",
    swatch: ["#d4f547", "#121212"],
  },
  {
    id: "finance-lavender",
    label: "Finance lavender",
    group: "finance",
    source: "FinanceWidgetShell",
    description: "Soft lavender portfolio card.",
    swatch: ["#c4b5fd", "#ffffff"],
  },
  {
    id: "finance-white",
    label: "Finance white",
    group: "finance",
    source: "FinanceWidgetShell",
    description: "Clean white finance statement card.",
    swatch: ["#ffffff", "#121212"],
  },
  {
    id: "banking-purple",
    label: "Banking purple",
    group: "banking",
    source: "BankingWidgetShell",
    description: "Pastel purple banking card with Space Grotesk feel.",
    swatch: ["#c4b5fd", "#121212"],
  },
  {
    id: "banking-lime",
    label: "Banking lime",
    group: "banking",
    source: "BankingWidgetShell",
    description: "Neon lime neo-bank card.",
    swatch: ["#d9f99d", "#121212"],
  },
  {
    id: "banking-black",
    label: "Banking black",
    group: "banking",
    source: "BankingWidgetShell",
    description: "Premium black card with light type.",
    swatch: ["#121212", "#ffffff"],
  },
  {
    id: "banking-white",
    label: "Banking white",
    group: "banking",
    source: "BankingWidgetShell",
    description: "Minimal white banking receipt card.",
    swatch: ["#ffffff", "#121212"],
  },
  {
    id: "banking-chamfer",
    label: "Chamfer cut",
    group: "banking",
    source: "BankingWidgetShell",
    description: "Angular chamfer clip-path — editorial banking layout.",
    swatch: ["#c4b5fd", "#121212"],
  },
  {
    id: "fitness-dark",
    label: "Fitness dark",
    group: "fitness",
    source: "FitnessWidgetShell",
    description: "Dark workout tracker shell.",
    swatch: ["#121212", "#ffffff"],
  },
  {
    id: "fitness-pink",
    label: "Fitness pink",
    group: "fitness",
    source: "FitnessWidgetShell",
    description: "Soft pink activity ring card.",
    swatch: ["#f9c5d1", "#121212"],
  },
];

export const BENTO_DEFAULT_THEME: BentoCardThemeId = "surface-default";

export function getBentoTheme(id: BentoCardThemeId | undefined): BentoCardTheme {
  return BENTO_CARD_THEMES.find((theme) => theme.id === id) ?? BENTO_CARD_THEMES[0];
}

export function themesByGroup(group: BentoThemeGroup): BentoCardTheme[] {
  return BENTO_CARD_THEMES.filter((theme) => theme.group === group);
}
