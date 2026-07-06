import { useCallback, useMemo, useState } from "react";
import type { OnboardingFlowId } from "./onboardingMock";
import { ONBOARDING_FLOWS, onboardingFlow } from "./onboardingMock";

const DISMISS_KEY = "arco:onboarding-demo:dismissed";

function readDismissed(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeDismissed(map: Record<string, boolean>) {
  localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
}

/** STUB: flow picker + per-placement visibility for the onboarding demo app. */
export function useOnboardingStub() {
  const [flowId, setFlowId] = useState<OnboardingFlowId>("notes-intro");
  const [dismissed, setDismissed] = useState<Record<string, boolean>>(readDismissed);

  const flow = useMemo(() => onboardingFlow(flowId), [flowId]);

  const isVisible = useCallback(
    (placementId: string) => !dismissed[`${flowId}:${placementId}`],
    [dismissed, flowId],
  );

  const dismiss = useCallback(
    (placementId: string) => {
      setDismissed((prev) => {
        const next = { ...prev, [`${flowId}:${placementId}`]: true };
        writeDismissed(next);
        return next;
      });
    },
    [flowId],
  );

  const resetPlacements = useCallback(() => {
    setDismissed((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${flowId}:`)) delete next[key];
      }
      writeDismissed(next);
      return next;
    });
  }, [flowId]);

  return {
    flows: ONBOARDING_FLOWS,
    flowId,
    setFlowId,
    flow,
    isVisible,
    dismiss,
    resetPlacements,
  };
}

export type OnboardingViewModel = ReturnType<typeof useOnboardingStub>;
