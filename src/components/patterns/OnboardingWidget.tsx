/**
 * Embeddable onboarding widget — drop into empty states, banners, side panels,
 * or full cards. Controlled or uncontrolled step index.
 */
import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "../ui";
import type { OnboardingStep, OnboardingWidgetProps } from "./onboardingTypes";

function clampStepIndex(index: number, length: number) {
  return Math.max(0, Math.min(length - 1, index));
}

function ProgressDots({
  count,
  active,
  completeBefore,
}: {
  count: number;
  active: number;
  completeBefore: number;
}) {
  return (
    <div className="arco-onboard__dots" role="tablist" aria-label="Onboarding progress">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={[
            "arco-onboard__dot",
            index === active && "arco-onboard__dot--active",
            index < completeBefore && "arco-onboard__dot--complete",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-current={index === active ? "step" : undefined}
        />
      ))}
    </div>
  );
}

function StepNav({
  steps,
  stepIndex,
  onSelect,
}: {
  steps: OnboardingStep[];
  stepIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="arco-onboard__nav">
      {steps.map((entry, index) => {
        const Icon = entry.icon;
        const active = index === stepIndex;
        const complete = index < stepIndex;
        return (
          <li key={entry.id}>
            <button
              type="button"
              className={[
                "arco-onboard__nav-item",
                active && "arco-onboard__nav-item--active",
                complete && "arco-onboard__nav-item--complete",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelect(index)}
              aria-current={active ? "step" : undefined}
            >
              <span className="arco-onboard__nav-index" aria-hidden>
                {index + 1}
              </span>
              {Icon ? (
                <span className="arco-onboard__nav-icon" aria-hidden>
                  <Icon size={14} strokeWidth={1.8} />
                </span>
              ) : null}
              <span className="arco-onboard__nav-label">{entry.title}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StepBody({ step }: { step: OnboardingStep }) {
  const Icon = step.icon;
  return (
    <div className="arco-onboard__body">
      {Icon ? (
        <div className="arco-onboard__icon" aria-hidden>
          <Icon size={22} strokeWidth={1.6} />
        </div>
      ) : null}
      <h2 className="arco-onboard__title">{step.title}</h2>
      {step.description ? <p className="arco-onboard__desc">{step.description}</p> : null}
      {step.content ? <div className="arco-onboard__content">{step.content}</div> : null}
    </div>
  );
}

function WidgetFooter({
  step,
  atStart,
  atEnd,
  skippable,
  onPrev,
  onNext,
  onSkip,
}: {
  step: OnboardingStep;
  atStart: boolean;
  atEnd: boolean;
  skippable: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSkip?: () => void;
}) {
  const primaryLabel = step.primaryLabel ?? (atEnd ? "Done" : "Continue");
  const secondaryLabel = step.secondaryLabel ?? "Back";

  return (
    <footer className="arco-onboard__footer">
      <div className="arco-onboard__footer-start">
        {skippable && onSkip ? (
          <Button variant="ghost" onClick={onSkip}>
            Skip tour
          </Button>
        ) : null}
      </div>
      <div className="arco-onboard__footer-actions">
        {!atStart ? (
          <Button variant="ghost" onClick={onPrev}>
            <ChevronLeft size={16} />
            {secondaryLabel}
          </Button>
        ) : null}
        <Button variant="primary" onClick={onNext}>
          {primaryLabel}
          {!atEnd ? <ChevronRight size={16} /> : null}
        </Button>
      </div>
    </footer>
  );
}

function CardVariant(props: {
  steps: OnboardingStep[];
  stepIndex: number;
  step: OnboardingStep;
  atStart: boolean;
  atEnd: boolean;
  flowTitle?: string;
  flowSubtitle?: string;
  showProgress: boolean;
  showStepNav: boolean;
  dismissible: boolean;
  skippable: boolean;
  onSelect: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onDismiss?: () => void;
  onSkip?: () => void;
}) {
  const {
    steps,
    stepIndex,
    step,
    atStart,
    atEnd,
    flowTitle,
    flowSubtitle,
    showProgress,
    showStepNav,
    dismissible,
    skippable,
    onSelect,
    onPrev,
    onNext,
    onDismiss,
    onSkip,
  } = props;

  return (
    <>
      <header className="arco-onboard__header">
        <div className="arco-onboard__header-copy">
          {flowTitle ? <div className="arco-onboard__eyebrow">{flowTitle}</div> : null}
          {flowSubtitle ? <p className="arco-onboard__subtitle">{flowSubtitle}</p> : null}
          {showProgress ? (
            <div className="arco-onboard__progress-meta">
              Step {stepIndex + 1} of {steps.length}
            </div>
          ) : null}
        </div>
        {dismissible && onDismiss ? (
          <Button variant="ghost" size="icon" aria-label="Dismiss onboarding" onClick={onDismiss}>
            <X size={16} />
          </Button>
        ) : null}
      </header>

      {showStepNav && steps.length > 1 ? (
        <StepNav steps={steps} stepIndex={stepIndex} onSelect={onSelect} />
      ) : showProgress ? (
        <ProgressDots count={steps.length} active={stepIndex} completeBefore={stepIndex} />
      ) : null}

      <StepBody step={step} />

      <WidgetFooter
        step={step}
        atStart={atStart}
        atEnd={atEnd}
        skippable={skippable}
        onPrev={onPrev}
        onNext={onNext}
        onSkip={onSkip}
      />
    </>
  );
}

function CompactVariant(props: {
  steps: OnboardingStep[];
  stepIndex: number;
  step: OnboardingStep;
  atEnd: boolean;
  dismissible: boolean;
  onNext: () => void;
  onDismiss?: () => void;
}) {
  const { steps, stepIndex, step, atEnd, dismissible, onNext, onDismiss } = props;
  const primaryLabel = step.primaryLabel ?? (atEnd ? "Done" : "Next");

  return (
    <div className="arco-onboard__compact-row">
      <ProgressDots count={steps.length} active={stepIndex} completeBefore={stepIndex} />
      <div className="arco-onboard__compact-copy">
        <strong className="arco-onboard__compact-title">{step.title}</strong>
        {step.description ? <span className="arco-onboard__compact-desc">{step.description}</span> : null}
      </div>
      <div className="arco-onboard__compact-actions">
        <Button variant="primary" onClick={onNext}>
          {primaryLabel}
        </Button>
        {dismissible && onDismiss ? (
          <Button variant="ghost" size="icon" aria-label="Dismiss" onClick={onDismiss}>
            <X size={16} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function InlineVariant(props: {
  steps: OnboardingStep[];
  stepIndex: number;
  step: OnboardingStep;
  atStart: boolean;
  atEnd: boolean;
  flowTitle?: string;
  showProgress: boolean;
  skippable: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSkip?: () => void;
}) {
  const {
    steps,
    stepIndex,
    step,
    atStart,
    atEnd,
    flowTitle,
    showProgress,
    skippable,
    onPrev,
    onNext,
    onSkip,
  } = props;

  return (
    <>
      {flowTitle ? <div className="arco-onboard__inline-label">{flowTitle}</div> : null}
      {showProgress ? (
        <ProgressDots count={steps.length} active={stepIndex} completeBefore={stepIndex} />
      ) : null}
      <StepBody step={step} />
      <WidgetFooter
        step={step}
        atStart={atStart}
        atEnd={atEnd}
        skippable={skippable}
        onPrev={onPrev}
        onNext={onNext}
        onSkip={onSkip}
      />
    </>
  );
}

/** Reusable onboarding surface for empty states, banners, and panels. */
export function OnboardingWidget({
  steps,
  stepIndex: controlledIndex,
  defaultStepIndex = 0,
  onStepChange,
  onComplete,
  onDismiss,
  onSkip,
  variant = "card",
  flowTitle,
  flowSubtitle,
  showProgress = true,
  showStepNav = false,
  dismissible = true,
  skippable = true,
  className = "",
}: OnboardingWidgetProps) {
  const [uncontrolledIndex, setUncontrolledIndex] = useState(defaultStepIndex);
  const stepIndex = controlledIndex ?? uncontrolledIndex;
  const step = steps[stepIndex];
  const atStart = stepIndex === 0;
  const atEnd = stepIndex === steps.length - 1;

  if (!step || steps.length === 0) return null;

  const setStep = (index: number) => {
    const next = clampStepIndex(index, steps.length);
    if (controlledIndex === undefined) setUncontrolledIndex(next);
    onStepChange?.(next, steps[next]);
  };

  const goPrev = () => setStep(stepIndex - 1);

  const goNext = () => {
    if (atEnd) {
      onComplete?.();
      return;
    }
    setStep(stepIndex + 1);
  };

  const variantClass = `arco-onboard--${variant}`;
  const classes = ["arco-onboard", variantClass, className].filter(Boolean).join(" ");

  let body: ReactNode;
  if (variant === "compact") {
    body = (
      <CompactVariant
        steps={steps}
        stepIndex={stepIndex}
        step={step}
        atEnd={atEnd}
        dismissible={dismissible}
        onNext={goNext}
        onDismiss={onDismiss}
      />
    );
  } else if (variant === "inline") {
    body = (
      <InlineVariant
        steps={steps}
        stepIndex={stepIndex}
        step={step}
        atStart={atStart}
        atEnd={atEnd}
        flowTitle={flowTitle}
        showProgress={showProgress}
        skippable={skippable}
        onPrev={goPrev}
        onNext={goNext}
        onSkip={onSkip}
      />
    );
  } else {
    body = (
      <CardVariant
        steps={steps}
        stepIndex={stepIndex}
        step={step}
        atStart={atStart}
        atEnd={atEnd}
        flowTitle={flowTitle}
        flowSubtitle={flowSubtitle}
        showProgress={showProgress}
        showStepNav={showStepNav}
        dismissible={dismissible}
        skippable={skippable}
        onSelect={setStep}
        onPrev={goPrev}
        onNext={goNext}
        onDismiss={onDismiss}
        onSkip={onSkip}
      />
    );
  }

  return (
    <section className={classes} aria-label={flowTitle ?? "Onboarding"}>
      {body}
    </section>
  );
}
