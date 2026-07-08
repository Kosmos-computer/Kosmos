import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
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
      <EmptyState title={i18n.t(I18nKey.APPS$ONBOARDING_CARD_PLACEMENT_DISMISSED)}>
        <p className="arco-onboard-demo__hint"><T k={I18nKey.APPS$ONBOARDING_USE_RESET_PLACEMENTS_TO_SHOW_THIS_WIDGET_AGAIN} /></p>
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
            title={i18n.t(I18nKey.APPS$ONBOARDING_ONBOARDING_WIDGET)}
            subtitle={i18n.t(I18nKey.APPS$ONBOARDING_REUSABLE_STEP_FLOWS_FOR_EMPTY_STATES_BANNERS_AND_SIDE_PA)}
            actions={
              <Button variant="ghost" onClick={resetAll}>
                <RotateCcw size={16} /><T k={I18nKey.APPS$ONBOARDING_RESET_PLACEMENTS} /></Button>
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
            <PlacementSection label={i18n.t(I18nKey.APPS$ONBOARDING_CARD_EMPTY_STATE)}>
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

            <PlacementSection label={i18n.t(I18nKey.APPS$ONBOARDING_COMPACT_TOP_BANNER)}>
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
                  <span className="arco-onboard-demo__app-title"><T k={I18nKey.APPS$ONBOARDING_EXAMPLE_APP_CHROME} /></span>
                  <span className="arco-onboard-demo__hint"><T k={I18nKey.APPS$ONBOARDING_BANNER_SITS_ABOVE_APP_CONTENT} /></span>
                </div>
                <div className="arco-onboard-demo__app-body">
                  <p className="arco-onboard-demo__hint"><T k={I18nKey.APPS$ONBOARDING_DROP} /><code><T k={I18nKey.APPS$ONBOARDING_VARIANT_QUOT_COMPACT_QUOT} /></code><T k={I18nKey.APPS$ONBOARDING_UNDER_A_TOOLBAR_OR_TAB_ROW_FOR_LIGHTWEIGHT_TIPS} /></p>
                </div>
              </div>
            </PlacementSection>

            <PlacementSection label={i18n.t(I18nKey.APPS$ONBOARDING_INLINE_WITHIN_CONTENT)}>
              <div className="arco-onboard-demo__surface arco-onboard-demo__surface--app">
                <div className="arco-onboard-demo__app-body">
                  <p className="arco-onboard-demo__hint"><T k={I18nKey.APPS$ONBOARDING_INLINE_WIDGETS_NEST_INSIDE_FORMS_SETTINGS_SECTIONS_OR_MO} /></p>
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
                    <EmptyState title={i18n.t(I18nKey.APPS$ONBOARDING_INLINE_PLACEMENT_DISMISSED)} />
                  )}
                </div>
              </div>
            </PlacementSection>

            <PlacementSection label={i18n.t(I18nKey.APPS$ONBOARDING_SIDE_PANEL_CONTEXTUAL_HELP)}>
              <div className="arco-onboard-demo__surface">
                <div className="arco-onboard-demo__side-layout">
                  <div className="arco-onboard-demo__side-main">
                    <h2 className="arco-onboard-demo__app-title"><T k={I18nKey.APPS$ONBOARDING_MAIN_WORKSPACE} /></h2>
                    <p className="arco-onboard-demo__hint"><T k={I18nKey.APPS$ONBOARDING_KEEP_THE_WIDGET_IN_A_NARROW_COLUMN_WHILE_THE_USER_WORKS_} /></p>
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
                      <EmptyState title={i18n.t(I18nKey.APPS$ONBOARDING_SIDE_PANEL_DISMISSED)} />
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
