import { useState, type ReactNode } from "react";
import { useColumnResize } from "./useColumnResize";

export interface SidebarPaneProps {
  children: ReactNode;
  width?: number;
  defaultWidth?: number;
  onWidthChange?: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
  handleLabel?: string;
  className?: string;
}

/** Resizable left column for workspace sidebars. */
export function SidebarPane({
  children,
  width: widthProp,
  defaultWidth = 260,
  onWidthChange,
  minWidth = 220,
  maxWidth = 360,
  handleLabel = "Resize sidebar",
  className = "",
}: SidebarPaneProps) {
  const [internalWidth, setInternalWidth] = useState(defaultWidth);
  const width = widthProp ?? internalWidth;
  const setWidth = onWidthChange ?? setInternalWidth;

  const { onPointerDown, isResizing } = useColumnResize({
    value: width,
    onChange: setWidth,
    min: minWidth,
    max: maxWidth,
    handleSide: "right",
  });

  return (
    <div
      className={["arco-sidebar-pane", className].filter(Boolean).join(" ")}
      style={{ width: `min(100%, ${width}px)` }}
    >
      <div className="arco-sidebar-pane__content">{children}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={handleLabel}
        tabIndex={0}
        className={["arco-sidebar-pane__handle", isResizing ? "arco-sidebar-pane__handle--active" : ""]
          .filter(Boolean)
          .join(" ")}
        onPointerDown={onPointerDown}
      >
        <span className="arco-sidebar-pane__grip" aria-hidden="true" />
      </div>
    </div>
  );
}
