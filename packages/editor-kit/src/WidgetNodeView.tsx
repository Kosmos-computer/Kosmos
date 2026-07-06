import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { widgetDef } from "@shared/widgets/registry";
import { validateWidget } from "@shared/widgets/validate";

function trendGlyph(trend?: unknown): string {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  if (trend === "flat") return "→";
  return "";
}

export function WidgetNodeView({ node }: ReactNodeViewProps) {
  const attrs = node.attrs as {
    widgetType: string;
    version: number;
    props: Record<string, unknown>;
  };
  const payload = {
    type: attrs.widgetType,
    version: attrs.version,
    props: attrs.props ?? {},
  };
  const result = validateWidget(payload);

  if (!result.ok) {
    return (
      <NodeViewWrapper className="ek-widget ek-widget--fallback" contentEditable={false}>
        {result.fallbackMarkdown ? (
          <p>{result.fallbackMarkdown}</p>
        ) : (
          <>
            <div className="ek-widget__label">Widget error</div>
            <div className="ek-widget__error">{result.error}</div>
          </>
        )}
      </NodeViewWrapper>
    );
  }

  const { instance, def } = result;
  const { props } = instance;

  return (
    <NodeViewWrapper className={`ek-widget ek-widget--${def.type}`} contentEditable={false}>
      {def.type === "metric" ? (
        <>
          <div className="ek-widget__label">{String(props.label ?? "")}</div>
          <div className="ek-widget__value-row">
            <span className="ek-widget__value">{String(props.value ?? "")}</span>
            {props.delta ? (
              <span className={`ek-widget__delta ek-widget__delta--${String(props.trend ?? "flat")}`}>
                {trendGlyph(props.trend)} {String(props.delta)}
              </span>
            ) : null}
          </div>
          {props.caption ? <div className="ek-widget__caption">{String(props.caption)}</div> : null}
        </>
      ) : def.type === "progress" ? (
        <>
          <div className="ek-widget__progress-head">
            <span className="ek-widget__label">{String(props.label ?? "")}</span>
            <span>{typeof props.value === "number" ? props.value : 0}%</span>
          </div>
          <div className="ek-widget__progress-track">
            <div
              className="ek-widget__progress-fill"
              style={{ width: `${Math.min(100, Math.max(0, Number(props.value) || 0))}%` }}
            />
          </div>
        </>
      ) : def.type === "timeline" ? (
        <div className="ek-widget__timeline">
          {(Array.isArray(props.items) ? props.items : []).map((item, i) => {
            const row = (item ?? {}) as Record<string, unknown>;
            return (
              <div key={i} className="ek-widget__timeline-item">
                <div className="ek-widget__timeline-date">{String(row.date ?? "")}</div>
                <div>
                  <div className="ek-widget__timeline-title">{String(row.title ?? "")}</div>
                  {row.description ? (
                    <div className="ek-widget__timeline-desc">{String(row.description)}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>{widgetDef(instance.type, instance.version)?.description ?? instance.type}</div>
      )}
    </NodeViewWrapper>
  );
}
