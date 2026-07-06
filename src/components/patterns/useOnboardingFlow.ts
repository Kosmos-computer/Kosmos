import { useCallback, useState } from "react";
import type { OnboardingStep } from "./onboardingTypes";

export interface UseOnboardingFlowOptions {
  initialIndex?: number;
  onComplete?: () => void;
}

/** STUB: navigation state for OnboardingWidget — swap persistence layer later. */
export function useOnboardingFlow(steps: OnboardingStep[], options: UseOnboardingFlowOptions = {}) {
  const [stepIndex, setStepIndex] = useState(options.initialIndex ?? 0);
  const step = steps[stepIndex];
  const atStart = stepIndex === 0;
  const atEnd = stepIndex === steps.length - 1;
  const progress = steps.length > 0 ? (stepIndex + 1) / steps.length : 0;

  const goTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(steps.length - 1, index));
      setStepIndex(next);
    },
    [steps.length],
  );

  const next = useCallback(() => {
    if (atEnd) {
      options.onComplete?.();
      return;
    }
    goTo(stepIndex + 1);
  }, [atEnd, goTo, options, stepIndex]);

  const prev = useCallback(() => {
    goTo(stepIndex - 1);
  }, [goTo, stepIndex]);

  const restart = useCallback(() => {
    goTo(0);
  }, [goTo]);

  return {
    stepIndex,
    step,
    steps,
    atStart,
    atEnd,
    progress,
    goTo,
    next,
    prev,
    restart,
  };
}

export type OnboardingFlowViewModel = ReturnType<typeof useOnboardingFlow>;
