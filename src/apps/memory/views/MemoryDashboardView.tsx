import { I18nKey } from "../../../i18n/declaration";
import { T } from "../../../i18n/T";
import type { MemoryMetric } from "../types";

const TONE_CLASS: Record<NonNullable<MemoryMetric["tone"]>, string> = {
  accent: "arco-memory-metric--accent",
  success: "arco-memory-metric--success",
  warning: "arco-memory-metric--warning",
  neutral: "arco-memory-metric--neutral",
};

export function MemoryDashboardView({ metrics }: { metrics: MemoryMetric[] }) {
  return (
    <div className="arco-memory-view">
      <header className="arco-memory-view__header">
        <h1 className="arco-memory-view__title"><T k={I18nKey.APPS$MEMORY_DASHBOARD} /></h1>
        <p className="arco-memory-view__subtitle"><T k={I18nKey.APPS$MEMORY_OVERVIEW_OF_MEMORY_ENTRIES_GRAPH_SIZE_RAG_ACTIVITY_AND_V} /></p>
      </header>
      <div className="arco-memory-metrics">
        {metrics.map((metric) => (
          <article
            key={metric.id}
            className={["arco-memory-metric", metric.tone ? TONE_CLASS[metric.tone] : ""]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="arco-memory-metric__label">{metric.label}</div>
            <div className="arco-memory-metric__value">{metric.value}</div>
            {metric.change ? <div className="arco-memory-metric__change">{metric.change}</div> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
