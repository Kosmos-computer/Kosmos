import type { CSSProperties } from "react";
import { BentoMusicWidget } from "./BentoMusicWidget";
import { BentoWeatherWidget } from "./BentoWeatherWidget";
import type { BentoWidgetContent } from "./types";

export interface BentoCardContentProps {
  content: BentoWidgetContent;
}

/** Renders a single bento card body — KPI, stat ring, list, clock, or insight. */
export function BentoCardContent({ content }: BentoCardContentProps) {
  switch (content.kind) {
    case "kpi":
      return (
        <div className={`arco-bento-card arco-bento-card--kpi arco-bento-card--tone-${content.tone ?? "default"}`}>
          <span className="arco-bento-card__label">{content.label}</span>
          <strong className="arco-bento-card__value">{content.value ?? "—"}</strong>
          {content.meta ? <span className="arco-bento-card__meta">{content.meta}</span> : null}
        </div>
      );

    case "stat":
      return (
        <div className={`arco-bento-card arco-bento-card--stat arco-bento-card--tone-${content.tone ?? "default"}`}>
          <div className="arco-bento-card__stat-main">
            <span className="arco-bento-card__label">{content.label}</span>
            <strong className="arco-bento-card__value">{content.value ?? "—"}</strong>
            {content.meta ? <span className="arco-bento-card__meta">{content.meta}</span> : null}
          </div>
          {typeof content.percent === "number" ? (
            <div
              className="arco-bento-card__ring"
              style={{ "--arco-bento-ring-percent": `${content.percent}%` } as CSSProperties}
              aria-hidden="true"
            >
              <span>{content.percent}%</span>
            </div>
          ) : null}
        </div>
      );

    case "list":
      return (
        <div className="arco-bento-card arco-bento-card--list">
          <span className="arco-bento-card__label">{content.label}</span>
          <ul className="arco-bento-card__list">
            {(content.items ?? []).map((item) => (
              <li key={item.label} className="arco-bento-card__list-row">
                <span className="arco-bento-card__list-label">{item.label}</span>
                <span className="arco-bento-card__list-value">{item.value}</span>
                {item.change ? (
                  <span
                    className={`arco-bento-card__list-change arco-bento-card__list-change--${item.direction ?? "up"}`}
                  >
                    {item.change}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      );

    case "clock":
      return (
        <div className="arco-bento-card arco-bento-card--clock">
          <span className="arco-bento-card__label">{content.label}</span>
          <strong className="arco-bento-card__clock">{content.value ?? "—"}</strong>
          {content.meta ? <span className="arco-bento-card__meta">{content.meta}</span> : null}
        </div>
      );

    case "insight":
      return (
        <div className="arco-bento-card arco-bento-card--insight">
          <span className="arco-bento-card__insight-title">{content.title}</span>
          <p className="arco-bento-card__insight-copy">{content.description}</p>
        </div>
      );

    case "weather":
      return <BentoWeatherWidget />;

    case "music":
      return <BentoMusicWidget />;
  }
}
