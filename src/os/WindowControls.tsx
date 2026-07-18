import { I18nKey } from "../i18n/declaration";
/**
 * Window control buttons shared by virtual window frames and the Electron
 * titlebar. Style variants: traffic lights, glyph buttons, circle icons,
 * outlined circles, and capsules.
 *
 * Native order stays on the native side; the opposite alignment reverses it
 * so close sits on the outer edge:
 *   traffic-family + left  → close, min, max
 *   traffic-family + right → max, min, close
 *   glyph-family   + right → min, max, close
 *   glyph-family   + left  → close, max, min
 */
import { X, Minus, Maximize2, type LucideIcon } from "lucide-react";
import type { WindowControlAlign, WindowControlStyle } from "./themeTokens";
import { useTranslation } from "react-i18next";

interface Props {
  controlStyle: WindowControlStyle;
  align: WindowControlAlign;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}

type ControlId = "close" | "min" | "max";

/** macOS traffic-light order (native on the left). */
const TRAFFIC_LEFT: ControlId[] = ["close", "min", "max"];
/** Reversed traffic lights when placed on the right. */
const TRAFFIC_RIGHT: ControlId[] = ["max", "min", "close"];
/** Windows glyph order (native on the right). */
const GLYPH_RIGHT: ControlId[] = ["min", "max", "close"];
/** Reversed glyphs when placed on the left. */
const GLYPH_LEFT: ControlId[] = ["close", "max", "min"];

/** Compact chip styles use traffic positioning; glyph is the tall edge flush set. */
function usesGlyphOrder(style: WindowControlStyle): boolean {
  return style === "glyph" || style === "circles" || style === "outline" || style === "capsules";
}

function controlOrder(style: WindowControlStyle, align: WindowControlAlign): ControlId[] {
  if (usesGlyphOrder(style)) return align === "left" ? GLYPH_LEFT : GLYPH_RIGHT;
  return align === "left" ? TRAFFIC_LEFT : TRAFFIC_RIGHT;
}

function buttonClass(style: WindowControlStyle, id: ControlId): string {
  switch (style) {
    case "traffic":
      return `arco-window__dot arco-window__dot--${id}`;
    case "glyph":
      return ["arco-window__control", id === "close" && "arco-window__control--close"].filter(Boolean).join(" ");
    case "circles":
      return `arco-window__circle arco-window__circle--${id}`;
    case "outline":
      return `arco-window__outline arco-window__outline--${id}`;
    case "capsules":
      return `arco-window__capsule arco-window__capsule--${id}`;
  }
}

function iconStroke(style: WindowControlStyle, id: ControlId): number {
  if (style === "traffic") return 3.5;
  if (style === "glyph" && id === "max") return 2.25;
  if (style === "glyph") return 2.5;
  if (id === "max") return 2.25;
  return 2.4;
}

export function WindowControls({ controlStyle, align, onClose, onMinimize, onMaximize }: Props) {
  const { t } = useTranslation();
  const order = controlOrder(controlStyle, align);

  const actions: Record<ControlId, { label: string; onClick: () => void; Icon: LucideIcon }> = {
    close: { label: t(I18nKey.OS_WINDOWCONTROLS_CLOSE_WINDOW), onClick: onClose, Icon: X },
    min: { label: t(I18nKey.OS_WINDOWCONTROLS_MINIMIZE_WINDOW), onClick: onMinimize, Icon: Minus },
    max: { label: t(I18nKey.OS_WINDOWCONTROLS_MAXIMIZE_WINDOW), onClick: onMaximize, Icon: Maximize2 },
  };

  return (
    <div className={`arco-window__controls arco-window__controls--${controlStyle}`}>
      {order.map((id) => {
        const { label, onClick, Icon } = actions[id];
        return (
          <button
            key={id}
            type="button"
            className={buttonClass(controlStyle, id)}
            aria-label={label}
            onClick={onClick}
          >
            <Icon strokeWidth={iconStroke(controlStyle, id)} />
          </button>
        );
      })}
    </div>
  );
}
