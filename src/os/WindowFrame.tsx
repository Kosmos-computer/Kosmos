/**
 * A desktop window: draggable titlebar with traffic-light controls, edge and
 * corner resize handles, maximize toggle. Geometry writes back to the window
 * store (debounce-persisted, closed geometry retained — matrix-os pattern).
 */
import { useCallback, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { X, Minus, Maximize2 } from "lucide-react";
import { useOsStore } from "./osStore";
import { useWindowStore, type OsWindow } from "./windowStore";

const MENUBAR_HEIGHT = 34;
const MIN_W = 320;
const MIN_H = 220;

type ResizeEdge = "e" | "s" | "se";

interface Props {
  win: OsWindow;
  focused: boolean;
  children: ReactNode;
}

export function WindowFrame({ win, focused, children }: Props) {
  const shellView = useOsStore((s) => s.shellView);
  const appView = shellView === "app";
  const { close, focus, toggleMinimize, toggleMaximize, setRect } = useWindowStore();
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeState = useRef<{
    edge: ResizeEdge;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const onTitlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (win.maximized) return;
      // Ignore drags starting on the traffic-light buttons.
      if ((e.target as HTMLElement).closest(".arco-window__dot")) return;
      dragState.current = { startX: e.clientX, startY: e.clientY, origX: win.x, origY: win.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [win.maximized, win.x, win.y],
  );

  const onTitlePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const drag = dragState.current;
      if (!drag) return;
      const x = drag.origX + (e.clientX - drag.startX);
      const y = Math.max(MENUBAR_HEIGHT + 2, drag.origY + (e.clientY - drag.startY));
      setRect(win.id, { x, y });
    },
    [setRect, win.id],
  );

  const onTitlePointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  const startResize = useCallback(
    (edge: ResizeEdge) => (e: ReactPointerEvent) => {
      e.stopPropagation();
      resizeState.current = {
        edge,
        startX: e.clientX,
        startY: e.clientY,
        origW: win.w,
        origH: win.h,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [win.w, win.h],
  );

  const onResizeMove = useCallback(
    (e: ReactPointerEvent) => {
      const rs = resizeState.current;
      if (!rs) return;
      const dx = e.clientX - rs.startX;
      const dy = e.clientY - rs.startY;
      const patch: { w?: number; h?: number } = {};
      if (rs.edge === "e" || rs.edge === "se") patch.w = Math.max(MIN_W, rs.origW + dx);
      if (rs.edge === "s" || rs.edge === "se") patch.h = Math.max(MIN_H, rs.origH + dy);
      setRect(win.id, patch);
    },
    [setRect, win.id],
  );

  const onResizeUp = useCallback(() => {
    resizeState.current = null;
  }, []);

  // Maximized windows fill the area right of the nav rail (--arco-nav-width
  // is set by Desktop) and below the menu bar. App view uses the same footprint
  // but hides the titlebar and resize handles.
  const style = win.maximized || appView
    ? {
        left: "var(--arco-nav-width, 0px)",
        top: MENUBAR_HEIGHT,
        width: "calc(100vw - var(--arco-nav-width, 0px))",
        height: `calc(100vh - ${MENUBAR_HEIGHT}px)`,
        borderRadius: 0,
        zIndex: win.z,
      }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

  if (win.minimized) return null;

  return (
    <section
      className={[
        "arco-window",
        focused && "arco-window--focused",
        appView && "arco-window--app-view",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      role="dialog"
      aria-label={win.title}
      onPointerDown={() => focus(win.id)}
    >
      {!appView && (
        <header
          className="arco-window__titlebar"
          onPointerDown={onTitlePointerDown}
          onPointerMove={onTitlePointerMove}
          onPointerUp={onTitlePointerUp}
          onDoubleClick={() => toggleMaximize(win.id)}
        >
          <div className="arco-window__dots">
            <button
              className="arco-window__dot arco-window__dot--close"
              aria-label="Close window"
              onClick={() => close(win.id)}
            >
              <X strokeWidth={3.5} />
            </button>
            <button
              className="arco-window__dot arco-window__dot--min"
              aria-label="Minimize window"
              onClick={() => toggleMinimize(win.id)}
            >
              <Minus strokeWidth={3.5} />
            </button>
            <button
              className="arco-window__dot arco-window__dot--max"
              aria-label="Maximize window"
              onClick={() => toggleMaximize(win.id)}
            >
              <Maximize2 strokeWidth={3.5} />
            </button>
          </div>
          <span className="arco-window__title">{win.title}</span>
        </header>
      )}
      <div className="arco-window__content">{children}</div>

      {!win.maximized && !appView && (
        <>
          <div
            className="arco-window__resize arco-window__resize--e"
            onPointerDown={startResize("e")}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
          />
          <div
            className="arco-window__resize arco-window__resize--s"
            onPointerDown={startResize("s")}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
          />
          <div
            className="arco-window__resize arco-window__resize--se"
            onPointerDown={startResize("se")}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
          />
        </>
      )}
    </section>
  );
}
