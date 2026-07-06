import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Container,
  Download,
  HardDrive,
  KeyRound,
  Rocket,
  Sparkles,
  UserPlus,
  Zap,
} from "lucide-react";

/** Ordered first-run flow — preview-only until wired to real install state. */
export type StartupStepId =
  | "boot"
  | "welcome"
  | "storage"
  | "docker"
  | "model-select"
  | "model-setup"
  | "provider"
  | "user";

export interface StartupStep {
  id: StartupStepId;
  label: string;
  summary: string;
  icon: LucideIcon;
}

export const STARTUP_STEPS: StartupStep[] = [
  {
    id: "boot",
    label: "Boot",
    summary: "Splash while services start",
    icon: Zap,
  },
  {
    id: "welcome",
    label: "Welcome",
    summary: "Initial install intro",
    icon: Rocket,
  },
  {
    id: "storage",
    label: "Data location",
    summary: "Database and drive setup",
    icon: HardDrive,
  },
  {
    id: "docker",
    label: "Docker",
    summary: "Optional container runtime",
    icon: Container,
  },
  {
    id: "model-select",
    label: "Model path",
    summary: "Cloud API vs local models",
    icon: Boxes,
  },
  {
    id: "model-setup",
    label: "Model setup",
    summary: "Download and configure a local model",
    icon: Download,
  },
  {
    id: "provider",
    label: "Provider",
    summary: "API keys and endpoints",
    icon: KeyRound,
  },
  {
    id: "user",
    label: "Owner account",
    summary: "Secure this instance",
    icon: UserPlus,
  },
];

export const STARTUP_STEP_COUNT = STARTUP_STEPS.length;

export function startupStepIndex(id: StartupStepId): number {
  return STARTUP_STEPS.findIndex((step) => step.id === id);
}
