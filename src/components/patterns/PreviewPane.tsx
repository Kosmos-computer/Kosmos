import { useState, type ReactNode } from "react";
import { useColumnResize } from "./useColumnResize";

export interface PreviewPaneProps {
  children: ReactNode;
  width?: number;
  defaultWidth?: number;
  onWidthChange?: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
  handleLabel?: string;
  className?: string;
}

/** Resizable right column for detail / preview panes. */
export function PreviewPane({
  children,
  width: widthProp,
  defaultWidth = 340,
  onWidthChange,
  minWidth = 280,
  maxWidth = 520,
  handleLabel = "Resize preview pane",
  className = "",
}: PreviewPaneProps) {
  const [internalWidth, setInternalWidth] = useState(defaultWidth);
  const width = widthProp ?? internalWidth;
  const setWidth = onWidthChange ?? setInternalWidth;

  const { onPointerDown, isResizing } = useColumnResize({
    value: width,
    onChange: setWidth,
    min: minWidth,
    max: maxWidth,
    handleSide: "left",
  });

  return (
    <div
      className={["arco-preview-pane", className].filter(Boolean).join(" ")}
      style={{ width: `min(100%, ${width}px)` }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={handleLabel}
        tabIndex={0}
        className={["arco-resize-handle", isResizing ? "arco-resize-handle--active" : ""]
          .filter(Boolean)
          .join(" ")}
        onPointerDown={onPointerDown}
      >
        <span className="arco-resize-handle__grip" aria-hidden="true" />
      </div>
      <div className="arco-preview-pane__content">{children}</div>
    </div>
  );
}
