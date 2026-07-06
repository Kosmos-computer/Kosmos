export const specMeta = {
  eyebrow: "Arco · Design System Spec · Draft v0.2",
  title: "One contract, every surface",
  description:
    "Arco is the generative UI library for Kosmos: a typed, themeable vocabulary an AI assembles into apps across desktop, tablet, phone, watch, and widget.",
  positioning: "The adaptive, themeable component-contract layer for generative UI",
} as const;

export const specNavLinks = [
  { label: "Foundation", href: "#foundation" },
  { label: "Decisions", href: "#decisions" },
  { label: "Architecture", href: "#architecture" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "Adoption", href: "#adoption" },
  { label: "Product", href: "#product" },
] as const;

/* ------------------------------------------------------------------ */
/* Foundation — goals + current state                                   */
/* ------------------------------------------------------------------ */

export const nonNegotiables = [
  {
    title: "Bounded generation surface",
    body: "The AI assembles from a typed, validated vocabulary — it never emits arbitrary CSS, HTML, or Tailwind. That is what makes generation reliable, themeable, and safe.",
  },
  {
    title: "Themeability",
    body: "Full light / dark / custom theming via --arco-* tokens. No hardcoded values, anywhere — already the house rule.",
  },
  {
    title: "Portability",
    body: "The library is consumed by Kosmos today and should drop into openclaw-os, odyssey, or openhands later without heavy build coupling.",
  },
  {
    title: "One source of truth",
    body: "Tokens, component contract, and prompt each have exactly one definition. No drift between what renders, what the AI is told, and what is documented.",
  },
] as const;

export type AssessmentVerdict = "keep" | "warn" | "gap";

export const currentState = [
  {
    layer: "Tokens",
    today: "--arco-* CSS custom props, light/dark blocks, JS mirror in tokens.ts",
    verdict: "keep" as AssessmentVerdict,
    note: "Strong foundation",
  },
  {
    layer: "Styling",
    today: "BEM classes + cx() — zero runtime cost, full theming",
    verdict: "keep" as AssessmentVerdict,
    note: "Keep as core",
  },
  {
    layer: "Primitives",
    today: "Growing ui/ and patterns/ libraries, forwardRef, token-driven",
    verdict: "keep" as AssessmentVerdict,
    note: "Needs a manifest layer",
  },
  {
    layer: "Gen-UI",
    today: "OpenUI Lang + @openuidev/react-ui — migrating toward block registry",
    verdict: "warn" as AssessmentVerdict,
    note: "Won't scale without registry; needs runtime validation",
  },
  {
    layer: "Multi-device",
    today: "SurfaceManager + policies per form factor",
    verdict: "keep" as AssessmentVerdict,
    note: "Blocks should declare support",
  },
  {
    layer: "AI prompt",
    today: "Implicit — the model must \u201cknow\u201d block shapes from generated schema",
    verdict: "gap" as AssessmentVerdict,
    note: "Biggest gap — no generated grammar from one registry",
  },
] as const;

export const takeaway =
  "We already have ~80% of a generative design system. The missing 20% is a contract/registry layer that turns each block into schema + validator + prompt + docs + render mapping from one definition.";

/* ------------------------------------------------------------------ */
/* Key decisions D1–D8                                                  */
/* ------------------------------------------------------------------ */

export const decisions = [
  {
    id: "D1",
    topic: "Styling",
    title: "Tokens-first, BEM core",
    oneLiner: "The AI emits schema, not CSS — Tailwind isn't the generation surface.",
    points: [
      "Keep BEM + --arco-* tokens as the styling core; no Tailwind rewrite.",
      "Optional Tailwind v4 @theme preset maps utilities to the same tokens for human product code.",
      "Rule: Tailwind consumes tokens; tokens never depend on Tailwind.",
    ],
  },
  {
    id: "D2",
    topic: "shadcn/ui",
    title: "Reference + cherry-pick",
    oneLiner: "Adopt the registry distribution idea, not the theme or dependency.",
    points: [
      "shadcn's real innovation is the copy-in registry model — exactly right for shipping Arco blocks into host apps.",
      "Optionally adopt Radix behaviors under complex interactive components where a11y demands.",
      "Never adopt its Tailwind theme or aesthetic — our token system is stronger.",
    ],
  },
  {
    id: "D3",
    topic: "Standards",
    title: "AG-UI transport, spec-pluggable payload",
    oneLiner: "Don't marry one spec — emit many from one registry, render into our components.",
    points: [
      "AG-UI is becoming infrastructure (AWS, Microsoft) — adopt it as the agent↔UI event layer.",
      "One block manifest emits A2UI (primary), OpenUI Lang, and our own JSON — all render into the same themed components.",
      "MCP Apps covers third-party, untrusted tool UIs via sandboxed iframes.",
    ],
  },
  {
    id: "D4",
    topic: "Components",
    title: "Four tiers, one contract",
    oneLiner: "Tokens → Primitives → Blocks → Containers. Blocks are the AI's unit of generation.",
    points: [
      "Primitives are themeable atoms styled with BEM classes.",
      "Blocks take pure-data props with schema, prompt description, and form-factor support.",
      "Containers are the frames generated content lives in — windows, stacks, tiles, shells.",
    ],
  },
  {
    id: "D5",
    topic: "Generation contract",
    title: "One manifest per block",
    oneLiner: "A single defineBlock() drives validation, prompt, docs, catalog, and render — zero drift.",
    points: [
      "Replaces the implicit type union and the giant render switch.",
      "Zod schema → runtime validation + JSON Schema for constrained decoding.",
      "Examples feed few-shot prompts, the design catalog, and tests from one place.",
    ],
  },
  {
    id: "D6",
    topic: "Renderers",
    title: "Two renderers, one registry",
    oneLiner: "Static JSON and streaming Lang share the same components.",
    points: [
      "Chat streaming renders OpenUI Lang / A2UI payloads live.",
      "Durable dashboards and generated apps render static schema JSON.",
      "Both resolve through registry[type].render — author a block once.",
    ],
  },
  {
    id: "D7",
    topic: "Cross-platform",
    title: "Tokens as the portable contract",
    oneLiner: "The AI targets component contracts, not CSS — native renderers can come later.",
    points: [
      "Today: tokens + SurfaceManager policies cover every web form factor.",
      "Later: a Style Dictionary pipeline emits CSS and native token outputs from one source.",
      "A native renderer implements the same registry types without touching generation.",
    ],
  },
  {
    id: "D8",
    topic: "Adaptivity",
    title: "Window size classes, not device types",
    oneLiner: "Break layout by available window size — fluid by construction.",
    points: [
      "Compact / Medium / Expanded size classes via CSS container queries, evaluated per pane.",
      "FormFactor becomes an input profile (pointer vs touch), not the layout driver.",
      "Blocks declare adaptivity: min width, ideal columns per class, reflow behavior on compact.",
    ],
  },
] as const;

/* ------------------------------------------------------------------ */
/* Architecture — tiers, contract outputs, generation flow              */
/* ------------------------------------------------------------------ */

export const tiers = [
  {
    tier: "Tier 0",
    name: "Tokens",
    detail: "--arco-* — color, space, radius, type, motion, z, elevation",
  },
  {
    tier: "Tier 1",
    name: "Primitives",
    detail: "Button, Card, Input, Avatar, Badge, Menu, Modal… themeable atoms",
  },
  {
    tier: "Tier 2",
    name: "Blocks",
    detail: "Data-driven composites the AI assembles — StatCards, CalendarSchedule, MediaCards…",
  },
  {
    tier: "Tier 3",
    name: "Containers",
    detail: "AppShell slots, Desktop window, Phone stack, Widget tile, GeneratedSurface",
  },
] as const;

export const contractSnippet = `defineBlock({
  type: "statCards",
  schema: z.object({ /* Zod */ }),
  description: "Grid of KPI stat cards…",
  adaptivity: {
    inputProfiles: ["pointer", "touch"],
    minWidth: 220,
    idealColumns: { compact: 1, medium: 2, expanded: 4 },
    onCompact: "stack",
  },
  examples: [ /* golden samples */ ],
  render: (props) => <StatCards {...props} />,
})`;

export const contractOutputs = [
  { label: "Runtime validation", detail: "Reject or repair malformed AI output before render" },
  { label: "JSON Schema / grammar", detail: "Constrained decoding and tool-call arguments" },
  { label: "System prompt", detail: "The AI's menu, generated — never hand-maintained" },
  { label: "Design catalog", detail: "Storybook-style docs straight from examples" },
  { label: "Render mapping", detail: "registry[type].render kills the giant switch" },
] as const;

export const generationFlow = [
  {
    step: "Prompt",
    detail:
      "The registry generates the model's allowed vocabulary, filtered by the target surface's size class and input profile.",
  },
  {
    step: "Emit",
    detail: "The agent streams OpenUI Lang or returns block JSON as a tool call.",
  },
  {
    step: "Validate",
    detail: "Output is checked against the registry's Zod schemas and auto-repaired where possible.",
  },
  {
    step: "Render",
    detail: "Each node resolves via registry[type].render into themed Arco components.",
  },
  {
    step: "Persist",
    detail: "Ephemeral surfaces stay inline in Chat; durable ones become apps via app_create.",
  },
] as const;

/* ------------------------------------------------------------------ */
/* Roadmap                                                              */
/* ------------------------------------------------------------------ */

export type RoadmapStatus = "now" | "next" | "later";

export const roadmapPhases = [
  {
    id: "now",
    marker: "Now",
    title: "Registry prototype",
    timeframe: "Weeks · low risk · no backend",
    status: "now" as RoadmapStatus,
    summary:
      "Turn existing blocks into a real contract inside Kosmos — mechanical, high leverage.",
    items: [
      "Registry + Zod schemas for all existing blocks; render switch → registry[type].render",
      "Generate the system prompt from the registry",
      "Runtime validation + repair on generated schemas",
      "OpenUI spike in Chat: stream two block types end-to-end",
      "Adaptivity spike: 2–3 blocks on container-query size classes",
      "Design System workspace becomes the living catalog, fed from examples",
    ],
  },
  {
    id: "v01",
    marker: "v0.1",
    title: "Single process",
    timeframe: "Kosmos shell + OpenClaw gateway plugin",
    status: "next" as RoadmapStatus,
    summary:
      "One origin, one process: the shell ships as a gateway plugin with Chat speaking OpenUI / AG-UI.",
    items: [
      "Chat workspace streams generated blocks inline",
      "Core seven workspaces only — Chat, Apps, Desktop, Notes, Tasks/Calendar, Files, Settings",
      "Mock data for Notes and Tasks behind interface seams",
    ],
  },
  {
    id: "v02",
    marker: "v0.2",
    title: "Engines mount",
    timeframe: "Durable apps + real backends",
    status: "next" as RoadmapStatus,
    summary:
      "Generated apps become first-class and heavy engines arrive lazily, per workspace.",
    items: [
      "app_create persistence — generated apps live on Desktop, Apps grid, phone, widgets",
      "agent-canvas embedded as the Code workspace (lazy-loaded)",
      "Notes backed by plugin SQLite or the Joplin data API",
    ],
  },
  {
    id: "v03",
    marker: "v0.3",
    title: "Optional planes",
    timeframe: "Only if a real need appears",
    status: "later" as RoadmapStatus,
    summary:
      "Productivity and retrieval sidecars stay at arm's length — detachable by construction.",
    items: [
      "Odysseus sidecar for email, calendar, and research tools (AGPL — over HTTP/MCP only)",
      "Open WebUI-style RAG backend if retrieval becomes a real requirement",
      "Each release re-checks anti-bloat: unneeded growth gets demoted to a registry entry",
    ],
  },
  {
    id: "standard",
    marker: "Long term",
    title: "Library → standard",
    timeframe: "Spec, conformance, marketplace",
    status: "later" as RoadmapStatus,
    summary:
      "Separate the spec from the implementation so other people can implement it — that is what makes it a standard.",
    items: [
      "Unify every payload emitter (A2UI, OpenUI Lang, our JSON) on the one registry",
      "Arco registry CLI — shadcn-style installs into host apps and by the AI itself",
      "Versioned spec + conformance test suite + reference implementation",
      "Style Dictionary token pipeline; first non-web renderer against the registry",
      "Open registry / marketplace: signed, versioned app manifests — npm for manifests",
    ],
  },
] as const;

export const roadmapStatusLabels: Record<RoadmapStatus, string> = {
  now: "In progress",
  next: "Up next",
  later: "Horizon",
};

/* ------------------------------------------------------------------ */
/* Adoption & standardization                                           */
/* ------------------------------------------------------------------ */

export const adoptionPillars = [
  {
    title: "Own a different layer",
    body: "Transport (AG-UI) and payload (A2UI, MCP Apps, OpenUI) already have strong owners. Our defensible layer is the adaptive, themeable component-contract + registry — nobody owns that. Compose with the winning specs; don't compete.",
  },
  {
    title: "Spec ≠ implementation",
    body: "Publish a versioned spec — manifest shape, token contract, adaptivity descriptor, canonical layouts — plus a conformance suite so anyone can build a compatible renderer and prove it.",
  },
  {
    title: "Zero switching cost",
    body: "Adapters, not ultimatums: teams register their existing shadcn / Radix / in-house components into the contract. Incremental, eject-to-source, bring-your-own-renderer.",
  },
  {
    title: "Network effects",
    body: "An open, decentralized registry where every entry ships schema + prompt + examples + a11y + adaptivity — instantly AI-usable on install. More blocks → more useful → more contributors.",
  },
] as const;

export type ScorecardStatus = "todo" | "partial" | "done";

export const scorecard = [
  { label: "Versioned spec doc", status: "partial" as ScorecardStatus },
  { label: "Machine-readable schema", status: "partial" as ScorecardStatus },
  { label: "Conformance test suite", status: "todo" as ScorecardStatus },
  { label: "Reference implementation", status: "partial" as ScorecardStatus },
  { label: "Permissive license", status: "todo" as ScorecardStatus },
  { label: "CLI + starter templates", status: "todo" as ScorecardStatus },
  { label: "Live playground", status: "todo" as ScorecardStatus },
  { label: "Docs site w/ examples", status: "partial" as ScorecardStatus },
  { label: "Adapters (shadcn / Tailwind / BYO)", status: "todo" as ScorecardStatus },
  { label: "Open registry / marketplace", status: "todo" as ScorecardStatus },
  { label: "Accessibility baseline", status: "partial" as ScorecardStatus },
  { label: "Security / sandbox model", status: "todo" as ScorecardStatus },
  { label: "Semver + migration codemods", status: "todo" as ScorecardStatus },
  { label: "Public governance + RFCs", status: "todo" as ScorecardStatus },
  { label: "Framework-agnostic core", status: "todo" as ScorecardStatus },
  { label: "Model / provider-agnostic", status: "partial" as ScorecardStatus },
  { label: "i18n / RTL support", status: "todo" as ScorecardStatus },
  { label: "Community channels", status: "todo" as ScorecardStatus },
] as const;

export const scorecardStatusLabels: Record<ScorecardStatus, string> = {
  todo: "Not started",
  partial: "Partial",
  done: "Done",
};

/* ------------------------------------------------------------------ */
/* Product build strategy                                               */
/* ------------------------------------------------------------------ */

export const primeDirective =
  "Kosmos owns the shell and agent UX. Arco owns the design system and generative-UI surface. Everything else is an engine we mount — compose, don't rebuild.";

export const coreSeven = [
  "Chat",
  "Generated / Apps",
  "Desktop",
  "Notes",
  "Tasks / Calendar",
  "Files",
  "Settings",
] as const;

export const engines = [
  {
    capability: "Agent runtime, sessions, crons",
    engine: "OpenClaw Gateway",
    mode: "Primary backend; serves Kosmos as a plugin",
  },
  {
    capability: "Coding agent, terminal, git",
    engine: "agent-canvas + OpenHands",
    mode: "Library embed as the Code workspace",
  },
  {
    capability: "Notes, sync, E2EE, mobile",
    engine: "Joplin",
    mode: "Data backend behind our Notes workspace",
  },
  {
    capability: "Email, calendar, deep research",
    engine: "Odysseus",
    mode: "Optional sidecar over HTTP/MCP (AGPL, arm's length)",
  },
  {
    capability: "RAG, model management",
    engine: "Open WebUI",
    mode: "Reference architecture + optional API backend",
  },
  {
    capability: "Plugin packaging, app persistence",
    engine: "openclaw-os",
    mode: "The packaging blueprint for Kosmos",
  },
] as const;

export const antiBloatRules = [
  "Reference workspaces are a design catalog, not a product backlog — Kosmos ships the core seven.",
  "Every non-core capability is a detachable engine that lazy-loads with its workspace.",
  "One enforced dependency budget: React + lucide + Arco; new deps need a reason the registry can't cover.",
  "No speculative platform features — no RBAC, SSO, or i18n scaffolding until a real user needs them.",
  "The registry is the extension point, not the codebase: new apps land as data, not workspace code.",
] as const;

export const portabilityLadder = [
  { rung: "1", label: "Platform app", detail: "Manifest in the AppStore — theme, adaptivity, live data, agent actions" },
  { rung: "2", label: "Embedded app", detail: "Manifest + arco-runtime npm package in any React app" },
  { rung: "3", label: "Drop-in web", detail: "CDN browser bundle — any webpage or CMS, no build" },
  { rung: "4", label: "Standalone PWA", detail: "Compiled static site, installable and offline-capable" },
  { rung: "5", label: "Other AI ecosystems", detail: "Exported as MCP App or A2UI payload — runs in Claude, ChatGPT, Gemini" },
] as const;

/* ------------------------------------------------------------------ */
/* Appendix — decision summary                                          */
/* ------------------------------------------------------------------ */

export const decisionSummary = [
  { question: "Tailwind?", decision: "No for the system; optional token-preset for product code" },
  { question: "shadcn/ui?", decision: "Reference + registry model + optional Radix" },
  { question: "Standards", decision: "AG-UI transport; A2UI-first payload; MCP Apps for third-party" },
  { question: "Component model", decision: "Tokens → Primitives → Blocks → Containers" },
  { question: "Generation", decision: "One manifest per block → schema + prompt + render + docs" },
  { question: "Renderers", decision: "Two paths, one registry" },
  { question: "Cross-platform", decision: "Tokens as portable contract; Style Dictionary later" },
  { question: "Adaptivity", decision: "Window size classes + canonical layouts, fluid by construction" },
  { question: "Standardization", decision: "Open spec + conformance suite; zero switching cost" },
  { question: "Product build", decision: "Lean flagship: Kosmos shell + 7 workspaces; everything else is an engine" },
  { question: "Install story", decision: "One command/container; engines self-provision on first use" },
  { question: "Generated apps", decision: "App = manifest (data, not code) with 3 trust tiers" },
  { question: "Portability", decision: "Signed, versioned JSON manifests that outlive the platform" },
  { question: "External services", decision: "Open protocol → themed head; closed platforms → Tier-3 embed" },
] as const;
