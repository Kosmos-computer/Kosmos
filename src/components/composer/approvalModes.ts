/**
 * Composer approval posture options — how often the agent pauses for
 * confirmation before writing to disk, running shell, or calling write tools.
 * Mirrors the Codex / Claude permission ladders; wired through ApprovalMode
 * on each chat turn.
 */
import { Hand, Shield, ShieldAlert, type LucideIcon } from "lucide-react";
import type { ApprovalMode } from "@shared/types";

export interface ApprovalModeOption {
  id: ApprovalMode;
  /** Compact label on the composer trigger. */
  shortLabel: string;
  /** Full title inside the menu. */
  label: string;
  description: string;
  icon: LucideIcon;
}

export const APPROVAL_MODE_OPTIONS: ApprovalModeOption[] = [
  {
    id: "strict",
    shortLabel: "Ask",
    label: "Ask for approval",
    description: "Always ask before writing files, running shell, or using write tools.",
    icon: Hand,
  },
  {
    id: "smart",
    shortLabel: "Approve",
    label: "Approve for me",
    description: "Only ask for actions detected as potentially unsafe.",
    icon: Shield,
  },
  {
    id: "full",
    shortLabel: "Full",
    label: "Full access",
    description: "Run without asking — policy denies in Settings still apply.",
    icon: ShieldAlert,
  },
];

export const DEFAULT_APPROVAL_MODE: ApprovalMode = "smart";

export function approvalModeLabel(id: ApprovalMode): string {
  return APPROVAL_MODE_OPTIONS.find((o) => o.id === id)?.shortLabel ?? "Approve";
}
