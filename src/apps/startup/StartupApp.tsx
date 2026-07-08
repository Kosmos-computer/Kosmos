import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
/**
 * Setup workspace — preview the first-run flow (boot → account) without
 * mutating install state. Stub UI for design review and copy iteration.
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { MasterDetail } from "../../components/patterns";
import { Button } from "../../components/ui";
import { STARTUP_STEPS, type StartupStepId } from "./startupSteps";
import { StartupPreviewForStep } from "./StartupPreviewScreens";

export function StartupApp() {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STARTUP_STEPS[stepIndex];
  const atStart = stepIndex === 0;
  const atEnd = stepIndex === STARTUP_STEPS.length - 1;

  const goTo = (index: number) => {
    setStepIndex(Math.max(0, Math.min(STARTUP_STEPS.length - 1, index)));
  };

  const goToStep = (id: StartupStepId) => {
    const index = STARTUP_STEPS.findIndex((entry) => entry.id === id);
    if (index >= 0) goTo(index);
  };

  return (
    <div className="arco-startup">
      <MasterDetail
        list={
          <div className="arco-startup__nav">
            <div className="arco-startup__nav-header">
              <Sparkles size={16} strokeWidth={1.8} aria-hidden />
              <div>
                <div className="arco-startup__nav-title"><T k={I18nKey.APPS$STARTUP_FIRST_RUN_FLOW} /></div>
                <div className="arco-startup__nav-subtitle"><T k={I18nKey.APPS$STARTUP_PREVIEW_ONLY_NO_INSTALL_CHANGES} /></div>
              </div>
            </div>
            <ol className="arco-startup__steps">
              {STARTUP_STEPS.map((entry, index) => {
                const Icon = entry.icon;
                const active = index === stepIndex;
                const complete = index < stepIndex;
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={[
                        "arco-startup__step",
                        active && "arco-startup__step--active",
                        complete && "arco-startup__step--complete",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => goTo(index)}
                      aria-current={active ? "step" : undefined}
                    >
                      <span className="arco-startup__step-index" aria-hidden>
                        {index + 1}
                      </span>
                      <span className="arco-startup__step-icon" aria-hidden>
                        <Icon size={16} strokeWidth={1.8} />
                      </span>
                      <span className="arco-startup__step-copy">
                        <span className="arco-startup__step-label">{entry.label}</span>
                        <span className="arco-startup__step-summary">{entry.summary}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        }
        detail={
          <div className="arco-startup__stage">
            <header className="arco-startup__stage-header">
              <div>
                <div className="arco-startup__stage-eyebrow"><T k={I18nKey.APPS$STARTUP_STEP} />{stepIndex + 1}<T k={I18nKey.APPS$STARTUP_OF} />{STARTUP_STEPS.length}
                </div>
                <h1 className="arco-startup__stage-title">{step.label}</h1>
                <p className="arco-startup__stage-summary">{step.summary}</p>
              </div>
              <div className="arco-startup__stage-actions">
                <Button variant="ghost" disabled={atStart} onClick={() => goTo(stepIndex - 1)}>
                  <ChevronLeft size={16} /><T k={I18nKey.COMMON$PREVIOUS} /></Button>
                <Button variant="ghost" disabled={atEnd} onClick={() => goTo(stepIndex + 1)}><T k={I18nKey.COMMON$NEXT} /><ChevronRight size={16} />
                </Button>
              </div>
            </header>

            <div className="arco-startup__frame" aria-label={`Preview of ${step.label} screen`}>
              <StartupPreviewForStep stepId={step.id} />
            </div>

            <footer className="arco-startup__footer">
              <span className="arco-startup__footer-note"><T k={I18nKey.APPS$STARTUP_THESE_SCREENS_WILL_DRIVE_REAL_INSTALL_STATE_ONCE_ONBOARD} /></span>
              {!atEnd ? (
                <Button variant="primary" onClick={() => goTo(stepIndex + 1)}><T k={I18nKey.APPS$STARTUP_CONTINUE_TO} />{STARTUP_STEPS[stepIndex + 1].label}
                </Button>
              ) : (
                <Button variant="primary" onClick={() => goToStep("boot")}><T k={I18nKey.APPS$STARTUP_RESTART_PREVIEW} /></Button>
              )}
            </footer>
          </div>
        }
      />
    </div>
  );
}
