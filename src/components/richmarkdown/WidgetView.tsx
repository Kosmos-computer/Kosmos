/**
 * Render a validated widget instance with design-token styling.
 */
import type { WidgetDef } from "@shared/widgets/registry";
import type { WidgetInstance } from "@shared/widgets/validate";

interface Props {
  instance: WidgetInstance;
  def: WidgetDef;
}

function trendGlyph(trend?: unknown): string {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  if (trend === "flat") return "→";
  return "";
}

export function WidgetView({ instance, def }: Props) {
  const { props } = instance;

  switch (def.type) {
    case "metric":
      return (
        <div className="arco-widget arco-widget--metric">
          <div className="arco-widget__label">{String(props.label ?? "")}</div>
          <div className="arco-widget__value-row">
            <span className="arco-widget__value">{String(props.value ?? "")}</span>
            {props.delta ? (
              <span className={`arco-widget__delta arco-widget__delta--${String(props.trend ?? "flat")}`}>
                {trendGlyph(props.trend)} {String(props.delta)}
              </span>
            ) : null}
          </div>
          {props.caption ? (
            <div className="arco-widget__caption">{String(props.caption)}</div>
          ) : null}
        </div>
      );

    case "progress": {
      const value = typeof props.value === "number" ? Math.min(100, Math.max(0, props.value)) : 0;
      return (
        <div className="arco-widget arco-widget--progress">
          <div className="arco-widget__progress-head">
            <span className="arco-widget__label">{String(props.label ?? "")}</span>
            <span className="arco-widget__progress-pct">{value}%</span>
          </div>
          <div className="arco-widget__progress-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
            <div className="arco-widget__progress-fill" style={{ width: `${value}%` }} />
          </div>
          {props.detail ? (
            <div className="arco-widget__caption">{String(props.detail)}</div>
          ) : null}
        </div>
      );
    }

    case "timeline": {
      const items = Array.isArray(props.items) ? props.items : [];
      return (
        <div className="arco-widget arco-widget--timeline">
          {items.map((item, i) => {
            const row = (item ?? {}) as Record<string, unknown>;
            return (
              <div key={i} className="arco-widget__timeline-item">
                <div className="arco-widget__timeline-date">{String(row.date ?? "")}</div>
                <div className="arco-widget__timeline-body">
                  <div className="arco-widget__timeline-title">{String(row.title ?? "")}</div>
                  {row.description ? (
                    <div className="arco-widget__timeline-desc">{String(row.description)}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    default:
      return (
        <div className="arco-widget arco-widget--unknown">
          <span className="arco-widget__label">{def.type}@{def.version}</span>
        </div>
      );
  }
}

/** Validation failure — labeled fallback, never a crash. */
export function WidgetFallback({
  error,
  markdown,
  source,
}: {
  error: string;
  markdown: string | null;
  source?: string;
}) {
  if (markdown) {
    return (
      <div className="arco-widget arco-widget--fallback" title={error}>
        {markdown.split("\n").map((line, i) => (
          <p key={i} className="arco-richmd__p" style={{ margin: 0 }}>
            {line || "\u00a0"}
          </p>
        ))}
      </div>
    );
  }
  return (
    <div className="arco-widget arco-widget--error">
      <div className="arco-widget__error-label">Widget error</div>
      <div className="arco-widget__error-msg">{error}</div>
      {source ? <pre className="arco-richmd__pre">{source.trim()}</pre> : null}
    </div>
  );
}
