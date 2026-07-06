import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** One screen in an embeddable onboarding flow. */
export interface OnboardingStep {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Optional custom body below the title and description. */
  content?: ReactNode;
  primaryLabel?: string;
  secondaryLabel?: string;
}

export type OnboardingVariant = "card" | "compact" | "inline";

export interface OnboardingWidgetProps {
  steps: OnboardingStep[];
  /** Controlled step index. */
  stepIndex?: number;
  /** Uncontrolled initial step. */
  defaultStepIndex?: number;
  onStepChange?: (index: number, step: OnboardingStep) => void;
  onComplete?: () => void;
  onDismiss?: () => void;
  onSkip?: () => void;
  variant?: OnboardingVariant;
  /** Flow title shown above step content (card + inline). */
  flowTitle?: string;
  flowSubtitle?: string;
  showProgress?: boolean;
  /** Clickable step list in card variant. */
  showStepNav?: boolean;
  dismissible?: boolean;
  skippable?: boolean;
  className?: string;
}
