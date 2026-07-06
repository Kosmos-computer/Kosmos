/**
 * Onboarding playground — previews the embeddable widget in card, banner,
 * inline, and side-panel placements. Stub-only; no product analytics yet.
 */
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  ModuleHeader,
  ModuleInner,
  ModulePage,
} from "../../components/patterns/ModuleDashboard";
import { OnboardingWidget } from "../../components/patterns/OnboardingWidget";
import { useOnboardingFlow } from "../../components/patterns/useOnboardingFlow";
import { Button, Chip, EmptyState } from "../../components/ui";
import type { OnboardingFlowId } from "./onboardingMock";
import { useOnboardingStub } from "./useOnboardingStub";

function CardPlacement({
  flow,
  visible,
  onDismiss,
  onComplete,
}: {
  flow: ReturnType<typeof useOnboardingStub>["flow"];
  visible: boolean;
  onDismiss: () => void;
  onComplete: () => void;
}) {
  const cardNav = useOnboardingFlow(flow.steps, { onComplete });

  if (!visible) {
    return (
      <EmptyState title="Card placement dismissed">
        <p className="arco-onboard-demo__hint">Use “Reset placements” to show this widget again.</p>
      </EmptyState>
    );
  }

  return (
    <OnboardingWidget
      steps={flow.steps}
      stepIndex={cardNav.stepIndex}
      onStepChange={cardNav.goTo}
      variant="card"
      flowTitle={flow.label}
      flowSubtitle={flow.description}
      showStepNav={flow.steps.length > 2}
      onComplete={onComplete}
      onDismiss={onDismiss}
      onSkip={onDismiss}
    />
  );
}

function PlacementSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="arco-onboard-demo__placement">
      <div className="arco-onboard-demo__placement-label">{label}</div>
      {children}
    </section>
  );
}

export function OnboardingApp() {
  const stub = useOnboardingStub();
  const [cardKey, setCardKey] = useState(0);
  const inlineFlow = useOnboardingFlow(stub.flow.steps);
  const sideFlow = useOnboardingFlow(stub.flow.steps);
  const compactFlow = useOnboardingFlow(stub.flow.steps, {
    onComplete: () => stub.dismiss("compact"),
  });

  const resetAll = () => {
    stub.resetPlacements();
    inlineFlow.restart();
    sideFlow.restart();
    compactFlow.restart();
    setCardKey((value) => value + 1);
  };

  return (
    <div className="arco-onboard-demo">
      <ModulePage>
        <ModuleInner>
          <ModuleHeader
            title="Onboarding widget"
            subtitle="Reusable step flows for empty states, banners, and side panels."
            actions={
              <Button variant="ghost" onClick={resetAll}>
                <RotateCcw size={16} />
                Reset placements
              </Button>
            }
          />

          <div className="arco-onboard-demo__flow-picker">
            {stub.flows.map((entry) => (
              <Chip
                key={entry.id}
                active={stub.flowId === entry.id}
                onClick={() => {
                  stub.setFlowId(entry.id as OnboardingFlowId);
                  inlineFlow.restart();
                  sideFlow.restart();
                  compactFlow.restart();
                  setCardKey((value) => value + 1);
                }}
              >
                {entry.label}
              </Chip>
            ))}
          </div>

          <div className="arco-onboard-demo__placements">
            <PlacementSection label="Card — empty state">
              <div className="arco-onboard-demo__surface arco-onboard-demo__surface--empty">
                <CardPlacement
                  key={cardKey}
                  flow={stub.flow}
                  visible={stub.isVisible("card")}
                  onDismiss={() => stub.dismiss("card")}
                  onComplete={() => stub.dismiss("card")}
                />
              </div>
            </PlacementSection>

            <PlacementSection label="Compact — top banner">
              <div className="arco-onboard-demo__surface arco-onboard-demo__surface--app">
                {stub.isVisible("compact") ? (
                  <OnboardingWidget
                    steps={stub.flow.steps}
                    stepIndex={compactFlow.stepIndex}
                    onStepChange={compactFlow.goTo}
                    variant="compact"
                    showProgress
                    dismissible
                    skippable={false}
                    onComplete={() => stub.dismiss("compact")}
                    onDismiss={() => stub.dismiss("compact")}
                  />
                ) : null}
                <div className="arco-onboard-demo__app-bar">
                  <span className="arco-onboard-demo__app-title">Example app chrome</span>
                  <span className="arco-onboard-demo__hint">Banner sits above app content</span>
                </div>
                <div className="arco-onboard-demo__app-body">
                  <p className="arco-onboard-demo__hint">
                    Drop <code>variant=&quot;compact&quot;</code> under a toolbar or tab row for lightweight tips.
                  </p>
                </div>
              </div>
            </PlacementSection>

            <PlacementSection label="Inline — within content">
              <div className="arco-onboard-demo__surface arco-onboard-demo__surface--app">
                <div className="arco-onboard-demo__app-body">
                  <p className="arco-onboard-demo__hint">
                    Inline widgets nest inside forms, settings sections, or module pages.
                  </p>
                  {stub.isVisible("inline") ? (
                    <OnboardingWidget
                      steps={stub.flow.steps}
                      stepIndex={inlineFlow.stepIndex}
                      onStepChange={inlineFlow.goTo}
                      variant="inline"
                      flowTitle="Getting started"
                      onComplete={() => stub.dismiss("inline")}
                      onSkip={() => stub.dismiss("inline")}
                    />
                  ) : (
                    <EmptyState title="Inline placement dismissed" />
                  )}
                </div>
              </div>
            </PlacementSection>

            <PlacementSection label="Side panel — contextual help">
              <div className="arco-onboard-demo__surface">
                <div className="arco-onboard-demo__side-layout">
                  <div className="arco-onboard-demo__side-main">
                    <h2 className="arco-onboard-demo__app-title">Main workspace</h2>
                    <p className="arco-onboard-demo__hint">
                      Keep the widget in a narrow column while the user works in the primary pane.
                    </p>
                  </div>
                  <aside className="arco-onboard-demo__side-panel">
                    {stub.isVisible("side") ? (
                      <OnboardingWidget
                        steps={stub.flow.steps}
                        stepIndex={sideFlow.stepIndex}
                        onStepChange={sideFlow.goTo}
                        variant="card"
                        flowTitle="Tips"
                        showStepNav={stub.flow.steps.length > 2}
                        dismissible
                        onComplete={() => stub.dismiss("side")}
                        onDismiss={() => stub.dismiss("side")}
                        onSkip={() => stub.dismiss("side")}
                      />
                    ) : (
                      <EmptyState title="Side panel dismissed" />
                    )}
                  </aside>
                </div>
              </div>
            </PlacementSection>
          </div>
        </ModuleInner>
      </ModulePage>
    </div>
  );
}
