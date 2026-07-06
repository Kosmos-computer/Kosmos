export const siteMeta = {
  name: "Kosmos",
  tagline: "A generative AI operating system for integrated work",
  description:
    "One shell for chat, code, files, and generated apps. Plug in OpenClaw, OpenHands, and Arco — agents share focus context across every workspace.",
} as const;

export const demoUrl = "http://localhost:4610";
export const arcoDocsUrl = "http://localhost:5175";

export const navPillLinks = [
  { label: "Platform", href: "#platform" },
  { label: "Architecture", href: "#architecture" },
  { label: "Principles", href: "#principles" },
  { label: "FAQ", href: "#faq" },
  { label: "Arco", href: "/spec.html" },
] as const;

/** @deprecated Use navPillLinks — kept for spec page overrides */
export const navLinks = navPillLinks;

export const integrations = [
  "OpenClaw Gateway",
  "OpenHands agent-canvas",
  "Arco UI",
  "Odysseus",
] as const;

export const features = [
  {
    title: "Stable shell",
    description:
      "Nav rail, sidebar, main, and context panel — switch workspaces without reshuffling chrome.",
    href: "#platform",
    linkLabel: "Explore the shell",
  },
  {
    title: "Agent surface",
    description:
      "Chat, Orchestrator, Psyche, and inline generated UI — the brain stays in the context panel.",
    href: "#platform",
    linkLabel: "See agent UX",
  },
  {
    title: "Code workspace",
    description:
      "OpenHands agent-canvas embedded for terminals, diffs, and repo work — not a separate product tab.",
    href: "#architecture",
    linkLabel: "View architecture",
  },
  {
    title: "Generated apps",
    description:
      "Describe an app in chat; Arco renders it inside Desktop windows and the Apps grid.",
    href: "#architecture",
    linkLabel: "How gen-UI works",
  },
] as const;

export const principles = [
  {
    id: "I",
    title: "Shell stability",
    body: "Chrome is invariant. Workspaces plug into sidebar and main slots without remounting the frame.",
  },
  {
    id: "II",
    title: "Engine boundaries",
    body: "OpenClaw owns agent orchestration. OpenHands owns the coding sandbox. Arco owns streamed UI. Kosmos composes — it does not fork.",
  },
  {
    id: "III",
    title: "Shared focus context",
    body: "The assistant knows which workspace and entity you are viewing. AI actions attach to real focus, not orphaned prompts.",
  },
  {
    id: "IV",
    title: "Generated UI is first-class",
    body: "Agents emit Arco blocks in chat and ship full apps to Desktop. Rendering is not a bolt-on widget.",
  },
  {
    id: "V",
    title: "Multi-form-factor surfaces",
    body: "The same workspace renders full-screen, as a desktop window, on phone stack, or as a watch glance via SurfaceManager.",
  },
  {
    id: "VI",
    title: "Surgical integration",
    body: "One product experience without merging every repo into a monolith. Plug engines in per workspace.",
  },
] as const;

export const faqItems = [
  {
    question: "Is Kosmos a product or a prototype?",
    answer:
      "Arco-Prototype-2 is the working prototype. The production path is a Kosmos client served from the OpenClaw plugin with real gateway-backed stores.",
  },
  {
    question: "Do I need every backend running?",
    answer:
      "MVP: OpenClaw gateway plus Arco. Add OpenHands for the Code workspace. Odysseus is optional for productivity and RAG services.",
  },
  {
    question: "How is this different from agent-canvas alone?",
    answer:
      "agent-canvas is the coding engine. Kosmos is the full OS shell — chat, desktop, apps, memory, and reference workspaces around it.",
  },
  {
    question: "What is Arco vs Kosmos?",
    answer:
      "Kosmos is the operating system — shell, workspaces, and agent UX. Arco is the generative UI library: tokens, components, blocks, and the registry an AI assembles from.",
  },
  {
    question: "Is this another AI chat sidebar?",
    answer:
      "No. Kosmos is the presentation layer where agents, entity data, and generated UI share one session and focus model.",
  },
] as const;

export const architectureLayers = [
  { label: "Viewers", detail: "Browser, desktop, phone, watch" },
  { label: "Kosmos shell", detail: "AppShell · SurfaceManager · tokens" },
  { label: "Engines", detail: "OpenClaw · OpenHands · Arco · Odysseus" },
  { label: "Workspaces", detail: "Chat, Code, Apps, Notes, Orchestrator, …" },
] as const;
