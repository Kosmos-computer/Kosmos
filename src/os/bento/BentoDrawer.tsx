import { X } from "lucide-react";
import { useColumnResize } from "../../components/patterns/useColumnResize";
import { useDismiss } from "../../components/useDismiss";
import { useCallback, useRef } from "react";
import { BentoWorkspace } from "./BentoWorkspace";
import { useBentoStore } from "./bentoStore";

/** Floating right drawer over the desktop — hosts the bento widget grid. */
export function BentoDrawer() {
  const open = useBentoStore((s) => s.open);
  const width = useBentoStore((s) => s.width);
  const setOpen = useBentoStore((s) => s.setOpen);
  const setWidth = useBentoStore((s) => s.setWidth);
  const drawerRef = useRef<HTMLElement>(null);

  const close = useCallback(() => setOpen(false), [setOpen]);
  useDismiss(open, close, drawerRef);

  const { onPointerDown, isResizing } = useColumnResize({
    value: width,
    onChange: setWidth,
    min: 320,
    max: 720,
    handleSide: "left",
  });

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="arco-bento-drawer__scrim"
        aria-label="Close bento drawer"
        onClick={close}
      />
      <aside ref={drawerRef} className="arco-bento-drawer" style={{ width: `${width}px` }}>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize bento drawer"
          tabIndex={0}
          className={["arco-resize-handle", isResizing ? "arco-resize-handle--active" : ""]
            .filter(Boolean)
            .join(" ")}
          onPointerDown={onPointerDown}
        >
          <span className="arco-resize-handle__grip" aria-hidden="true" />
        </div>

        <div className="arco-bento-drawer__panel">
          <header className="arco-bento-drawer__header">
            <div className="arco-bento-drawer__header-main">
              <h2 className="arco-bento-drawer__title">Bento</h2>
              <p className="arco-bento-drawer__subtitle">Dock live widgets on your desktop</p>
            </div>
            <button
              type="button"
              className="arco-bento-drawer__close"
              onClick={close}
              aria-label="Close bento drawer"
            >
              <X size={16} />
            </button>
          </header>

          <div className="arco-bento-drawer__body">
            <BentoWorkspace />
          </div>
        </div>
      </aside>
    </>
  );
}
