/**
 * Window control buttons shared by virtual window frames and the Electron
 * titlebar: macOS traffic lights or Windows-style glyph buttons.
 */
import { X, Minus, Maximize2 } from "lucide-react";
import type { WindowControlStyle } from "./themeTokens";

interface Props {
  controlStyle: WindowControlStyle;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
}

export function WindowControls({ controlStyle, onClose, onMinimize, onMaximize }: Props) {
  if (controlStyle === "glyph") {
    return (
      <div className="arco-window__controls arco-window__controls--glyph">
        <button
          type="button"
          className="arco-window__control"
          aria-label="Minimize window"
          onClick={onMinimize}
        >
          <Minus strokeWidth={2.5} />
        </button>
        <button
          type="button"
          className="arco-window__control"
          aria-label="Maximize window"
          onClick={onMaximize}
        >
          <Maximize2 strokeWidth={2.25} />
        </button>
        <button
          type="button"
          className="arco-window__control arco-window__control--close"
          aria-label="Close window"
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
        aria-label="Close window"
        onClick={onClose}
      >
        <X strokeWidth={3.5} />
      </button>
      <button
        type="button"
        className="arco-window__dot arco-window__dot--min"
        aria-label="Minimize window"
        onClick={onMinimize}
      >
        <Minus strokeWidth={3.5} />
      </button>
      <button
        type="button"
        className="arco-window__dot arco-window__dot--max"
        aria-label="Maximize window"
        onClick={onMaximize}
      >
        <Maximize2 strokeWidth={3.5} />
      </button>
    </div>
  );
}
