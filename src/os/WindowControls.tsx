import { I18nKey } from "../i18n/declaration";
/**
 * Window control buttons shared by virtual window frames and the Electron
 * titlebar: macOS traffic lights or Windows-style glyph buttons.
 */
import { X, Minus, Maximize2 } from "lucide-react";
import type { WindowControlStyle } from "./themeTokens";
import { useTranslation } from "react-i18next";

interface Props {
  controlStyle: WindowControlStyle;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}

export function WindowControls({ controlStyle, onClose, onMinimize, onMaximize }: Props) {
  const { t } = useTranslation();
  if (controlStyle === "glyph") {
    return (
      <div className="arco-window__controls arco-window__controls--glyph">
        <button
          type="button"
          className="arco-window__control"
          aria-label={t(I18nKey.OS_WINDOWCONTROLS_MINIMIZE_WINDOW)}
          onClick={onMinimize}
        >
          <Minus strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className="arco-window__control"
          aria-label={t(I18nKey.OS_WINDOWCONTROLS_MAXIMIZE_WINDOW)}
          onClick={onMaximize}
        >
          <Maximize2 strokeWidth={2.25} />
        </button>
        <button
          type="button"
          className="arco-window__control arco-window__control--close"
          aria-label={t(I18nKey.OS_WINDOWCONTROLS_CLOSE_WINDOW)}
          onClick={onClose}
        >
          <X strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return (
    <div className="arco-window__controls arco-window__controls--traffic">
      <button
        type="button"
        className="arco-window__dot arco-window__dot--close"
        aria-label={t(I18nKey.OS_WINDOWCONTROLS_CLOSE_WINDOW)}
        onClick={onClose}
      >
        <X strokeWidth={3.5} />
      </button>
      <button
        type="button"
        className="arco-window__dot arco-window__dot--min"
        aria-label={t(I18nKey.OS_WINDOWCONTROLS_MINIMIZE_WINDOW)}
        onClick={onMinimize}
      >
        <Minus strokeWidth={3.5} />
      </button>
      <button
        type="button"
        className="arco-window__dot arco-window__dot--max"
        aria-label={t(I18nKey.OS_WINDOWCONTROLS_MAXIMIZE_WINDOW)}
        onClick={onMaximize}
      >
        <Maximize2 strokeWidth={3.5} />
      </button>
    </div>
  );
}
