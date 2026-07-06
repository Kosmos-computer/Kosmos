/**
 * Widget registry — the single source of truth for AI-embeddable content
 * widgets (docs/rich-content-widgets-plan.md).
 *
 * A widget instance is `{ type, version, props }` — schema'd data, never
 * markup. The registry feeds three consumers from one definition:
 *   1. the model's prompt section (generated, never hand-written prose),
 *   2. render-time validation in every host (RichMarkdown today, editor-kit
 *      node views later),
 *   3. the markdown fallback that keeps documents portable and lets
 *      unknown/old payloads degrade to labeled data instead of breaking.
 *
 * Versioning discipline: instances live in persisted documents forever, so
 * definitions are keyed `type` + `version` and MUST never change shape in
 * place — evolve by adding `type@2` alongside `type@1`.
 */

export interface PropSpec {
  type: "string" | "number" | "boolean" | "array";
  required?: boolean;
  description?: string;
  enum?: string[];
  /** For arrays of objects: the spec of each item's properties. */
  itemProps?: Record<string, PropSpec>;
}

export interface WidgetDef {
  type: string;
  version: number;
  /** One line: what this widget shows. */
  description: string;
  /** Selection heuristic for the model: when to prefer this over prose. */
  whenToUse: string;
  props: Record<string, PropSpec>;
  /** A complete, valid instance for the prompt (payload shape, not fence). */
  exemplar: { type: string; version: number; props: Record<string, unknown> };
  /** Plain-markdown degradation — REQUIRED so files stay valid markdown
   *  outside Arco and future hosts can always render something. */
  fallback: (props: Record<string, unknown>) => string;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

// ── Definitions ───────────────────────────────────────────────────────────────

const metric: WidgetDef = {
  type: "metric",
  version: 1,
  description: "A single key figure with an optional delta and trend arrow.",
  whenToUse:
    "One important number the reader should see at a glance (a KPI, a total, a percentage) — instead of burying it in a sentence.",
  props: {
    label: { type: "string", required: true, description: "What the number measures" },
    value: { type: "string", required: true, description: "The figure, preformatted (e.g. \"$12.4k\", \"87%\")" },
    delta: { type: "string", description: "Change vs. a reference period (e.g. \"+12%\")" },
    trend: { type: "string", enum: ["up", "down", "flat"], description: "Direction of the delta" },
    caption: { type: "string", description: "Small print under the value (period, source)" },
  },
  exemplar: {
    type: "metric",
    version: 1,
    props: { label: "Monthly revenue", value: "$12.4k", delta: "+12%", trend: "up", caption: "vs. May" },
  },
  fallback: (p) =>
    `**${str(p.label)}**: ${str(p.value)}${p.delta ? ` (${str(p.delta)})` : ""}${p.caption ? ` — ${str(p.caption)}` : ""}`,
};

const progress: WidgetDef = {
  type: "progress",
  version: 1,
  description: "A labeled progress bar toward a goal (0–100).",
  whenToUse:
    "Completion or capacity toward a known target: project status, budget used, storage, goal tracking.",
  props: {
    label: { type: "string", required: true },
    value: { type: "number", required: true, description: "Percent complete, 0–100" },
    detail: { type: "string", description: "Absolute figures (e.g. \"$7.5k of $10k\")" },
  },
  exemplar: {
    type: "progress",
    version: 1,
    props: { label: "Q3 savings goal", value: 75, detail: "$7.5k of $10k" },
  },
  fallback: (p) =>
    `**${str(p.label)}**: ${typeof p.value === "number" ? p.value : 0}%${p.detail ? ` (${str(p.detail)})` : ""}`,
};

const timeline: WidgetDef = {
  type: "timeline",
  version: 1,
  description: "A vertical sequence of dated events.",
  whenToUse:
    "Chronological content — project milestones, history, an itinerary, release plans. Prefer over a bulleted list of dates.",
  props: {
    items: {
      type: "array",
      required: true,
      description: "Events in display order",
      itemProps: {
        date: { type: "string", required: true, description: "Human-readable date or range" },
        title: { type: "string", required: true },
        description: { type: "string" },
      },
    },
  },
  exemplar: {
    type: "timeline",
    version: 1,
    props: {
      items: [
        { date: "Jul 10", title: "Kickoff", description: "Scope agreed" },
        { date: "Aug 1", title: "Beta" },
        { date: "Sep 15", title: "Launch" },
      ],
    },
  },
  fallback: (p) => {
    const items = Array.isArray(p.items) ? p.items : [];
    return items
      .map((item) => {
        const it = (item ?? {}) as Record<string, unknown>;
        return `- **${str(it.date)}** — ${str(it.title)}${it.description ? `: ${str(it.description)}` : ""}`;
      })
      .join("\n");
  },
};

// ── Registry ──────────────────────────────────────────────────────────────────

/** type → (version → def). Additions only; never mutate a shipped version. */
export const WIDGETS: Record<string, Record<number, WidgetDef>> = {
  metric: { 1: metric },
  progress: { 1: progress },
  timeline: { 1: timeline },
};

export function widgetDef(type: string, version: number): WidgetDef | undefined {
  return WIDGETS[type]?.[version];
}

/** Latest version of every registered widget (prompt generation). */
export function allWidgets(): WidgetDef[] {
  return Object.values(WIDGETS).map((versions) => {
    const latest = Math.max(...Object.keys(versions).map(Number));
    return versions[latest];
  });
}
