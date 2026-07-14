import { GitBranch, Keyboard, LayoutGrid, Link2, Sparkles, StickyNote } from "lucide-react";
import type { OnboardingStep } from "../../components/patterns/onboardingTypes";

export type OnboardingFlowId = "notes-intro" | "studio-tour" | "quick-tip";

export interface OnboardingFlowDef {
  id: OnboardingFlowId;
  label: string;
  description: string;
  steps: OnboardingStep[];
}

export const ONBOARDING_FLOWS: OnboardingFlowDef[] = [
  {
    id: "notes-intro",
    label: "Notes intro",
    description: "Three-step empty-state tour for the Notes app.",
    steps: [
      {
        id: "create",
        title: "Capture ideas fast",
        description: "Create a note from the sidebar or press ⌘N. Markdown, checklists, and links are supported.",
        icon: StickyNote,
        content: (
          <ul className="arco-onboard-demo__checklist">
            <li>Use [[wikilinks]] to connect notes</li>
            <li>Toggle graph view to explore connections</li>
            <li>Pin important notes to the top</li>
          </ul>
        ),
      },
      {
        id: "organize",
        title: "Organize with folders",
        description: "Group notes into folders from the sidebar. Drag notes between folders anytime.",
        icon: LayoutGrid,
      },
      {
        id: "share",
        title: "Share when ready",
        description: "Export a note or link it in Chat. Your vault stays on this machine until you choose to sync.",
        icon: Link2,
        primaryLabel: "Open Notes",
      },
    ],
  },
  {
    id: "studio-tour",
    label: "Studio tour",
    description: "Multi-step panel with step navigation for Studio.",
    steps: [
      {
        id: "projects",
        title: "Projects keep context together",
        description: "Each project bundles files, terminal tabs, and chat history for one workspace.",
        icon: Sparkles,
      },
      {
        id: "editor",
        title: "Edit and inspect side by side",
        description: "Split the editor with diffs, terminal, or a browser tab without leaving Studio.",
        icon: LayoutGrid,
      },
      {
        id: "git",
        title: "Review changes in place",
        description: "Open the Git tab to stage, diff, and commit without switching apps.",
        icon: GitBranch,
      },
      {
        id: "shortcuts",
        title: "Keyboard shortcuts",
        description: "Press ⌘K for the command palette. Most actions are one keystroke away.",
        icon: Keyboard,
        primaryLabel: "Start building",
      },
    ],
  },
  {
    id: "quick-tip",
    label: "Quick tip",
    description: "Single-step compact banner for lightweight hints.",
    steps: [
      {
        id: "tip",
        title: "Try voice in Chat",
        description: "Hold the mic button or press Space to dictate — transcription lands in the composer.",
        icon: Sparkles,
        primaryLabel: "Got it",
      },
    ],
  },
];

export function onboardingFlow(id: OnboardingFlowId): OnboardingFlowDef {
  const flow = ONBOARDING_FLOWS.find((entry) => entry.id === id);
  if (!flow) throw new Error(`Unknown onboarding flow: ${id}`);
  return flow;
}
