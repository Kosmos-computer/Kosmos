export const sphereSlides = [
  {
    title: "One shell, every workspace",
    description:
      "Nav rail, sidebar, main, and context panel — switch between Chat, Code, Apps, and Notes without reshuffling chrome.",
    image: "/kosmos-desktop.png",
    label: "Kosmos",
  },
  {
    title: "Agent surface",
    description:
      "Chat, Orchestrator, and inline generated UI share one session. The brain stays in the context panel.",
    label: "Chat",
  },
  {
    title: "Generated apps",
    description:
      "Describe an app in chat; Arco renders it inside Desktop windows and the Apps grid.",
    label: "Apps",
  },
  {
    title: "Code workspace",
    description:
      "OpenHands agent-canvas embedded for terminals, diffs, and repo work — not a separate product tab.",
    label: "Code",
  },
  {
    title: "Shared focus context",
    description:
      "The assistant knows which workspace and entity you are viewing. AI actions attach to real focus.",
    label: "Focus",
  },
  {
    title: "Engine boundaries",
    description:
      "OpenClaw orchestrates. OpenHands codes. Arco renders UI. Kosmos composes — it does not fork.",
    label: "Engines",
  },
] as const;

/** Cards duplicated to fill the Fibonacci sphere. */
export function buildSphereCards() {
  const base = sphereSlides.map((slide) => ({ ...slide }));
  return [...base, ...base, ...base, ...base].slice(0, 24);
}
