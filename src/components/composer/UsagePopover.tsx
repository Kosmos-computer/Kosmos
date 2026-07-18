import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * UsagePopover — the context-usage indicator under the composer: a ring dial
 * + label trigger ("42% context" → "Context over limit") opening a popover
 * with a context-window meter and plan usage rows.
 *
 * Tone thresholds: normal < 80% ≤ warning < 100% ≤ danger.
 */
import { useRef, useState } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { useDismiss } from "../useDismiss";

export interface UsageStats {
  /** Context used, in thousands of tokens (e.g. 96.3). */
  contextUsedK: number;
  /** Context limit, in thousands of tokens (e.g. 128). */
  contextLimitK: number;
  /** 5-hour plan usage, 0–100. */
  fiveHourPercent: number;
  /** Weekly plan usage across all models, 0–100. */
  weeklyPercent: number;
}

export interface UsagePopoverProps {
  stats: UsageStats;
  onPlanUsageClick?: () => void;
}

function formatTokensK(value: number): string {
  return `${value.toFixed(1)}k`;
}

export function contextPercent(stats: UsageStats): number {
  if (stats.contextLimitK <= 0) return 0;
  return Math.round((stats.contextUsedK / stats.contextLimitK) * 100);
}

function tone(percent: number): "normal" | "warning" | "danger" {
  if (percent >= 100) return "danger";
  if (percent >= 80) return "warning";
  return "normal";
}

const RING_RADIUS = 4.5;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function UsageRing({ percent, usageTone }: { percent: number; usageTone: ReturnType<typeof tone> }) {
  const fill = Math.min(100, Math.max(0, percent));
  const dashOffset = RING_CIRCUMFERENCE * (1 - fill / 100);

  return (
    <svg
      className="arco-usage__ring"
      viewBox="0 0 12 12"
      width="12"
      height="12"
      aria-hidden="true"
    >
      <circle className="arco-usage__ring-track" cx="6" cy="6" r={RING_RADIUS} />
      <circle
        className={`arco-usage__ring-fill arco-usage__ring-fill--${usageTone}`}
        cx="6"
        cy="6"
        r={RING_RADIUS}
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
}

export function UsagePopover({ stats, onPlanUsageClick }: UsagePopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), rootRef);

  const percent = contextPercent(stats);
  const usageTone = tone(percent);
  const label = percent >= 100 ? "Context over limit" : `${percent}% context`;

  return (
    <div className="arco-menu" ref={rootRef}>
      <button
        type="button"
        className="arco-usage__trigger"
        aria-label={`View usage: ${label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <UsageRing percent={percent} usageTone={usageTone} />
        <span className={`arco-usage__label arco-usage__label--${usageTone}`}>{label}</span>
      </button>

      {open && (
        <div role="dialog" aria-label={i18n.t(I18nKey.COMPONENTS$COMPOSER_USAGE)} className="arco-usage__panel">
          <div className="arco-usage__section">
            <div className="arco-usage__row">
              <span className="arco-usage__rowlabel"><T k={I18nKey.COMPONENTS$COMPOSER_CONTEXT_WINDOW} /></span>
              <span className="arco-usage__rowvalue">
                {formatTokensK(stats.contextUsedK)} / {formatTokensK(stats.contextLimitK)} ({percent}
                %)
                <ChevronRight size={12} />
              </span>
            </div>
            <div className="arco-usage__track" aria-hidden="true">
              <div
                className={`arco-usage__fill ${percent >= 100 ? "arco-usage__fill--over" : ""}`}
                style={{ width: `${Math.min(100, percent)}%` }}
              />
            </div>
          </div>

          <div className="arco-menu__separator" role="separator" />

          <div className="arco-usage__section">
            <button type="button" className="arco-usage__planbutton" onClick={onPlanUsageClick}>
              <span className="arco-usage__rowlabel"><T k={I18nKey.COMPONENTS$COMPOSER_PLAN_USAGE} /></span>
              <ArrowUpRight size={14} className="arco-usage__planicon" />
            </button>
            <div className="arco-usage__row">
              <span className="arco-usage__rowlabel"><T k={I18nKey.COMPONENTS$COMPOSER_5_HOUR_LIMIT} /></span>
              <span className="arco-usage__rowmuted">{stats.fiveHourPercent}%</span>
            </div>
            <div className="arco-usage__row">
              <span className="arco-usage__rowlabel"><T k={I18nKey.COMPONENTS$COMPOSER_WEEKLY_ALL_MODELS} /></span>
              <span className="arco-usage__rowmuted">{stats.weeklyPercent}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
