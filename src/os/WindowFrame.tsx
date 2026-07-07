/**
 * A desktop window: draggable titlebar with traffic-light or glyph controls,
 * edge and corner resize handles, maximize toggle. Geometry writes back to the
 * window store (debounce-persisted, closed geometry retained — matrix-os pattern).
 */
import { useCallback, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useOsStore } from "./osStore";
import { useWindowStore, type OsWindow } from "./windowStore";
import { WindowControls } from "./WindowControls";

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
  const windowControlAlign = useOsStore((s) => s.windowControlAlign);
  const windowControlStyle = useOsStore((s) => s.windowControlStyle);
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
      if ((e.target as HTMLElement).closest(".arco-window__dot, .arco-window__control")) return;
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

  const style = win.maximized || appView
    ? {
        left: "var(--arco-nav-width, 0px)",
        top: appView ? "var(--arco-menubar-offset, 0px)" : "var(--arco-window-top, 34px)",
        width: "calc(100% - var(--arco-nav-width, 0px))",
        height: appView
          ? "calc(100% - var(--arco-menubar-offset, 0px))"
          : "calc(100% - var(--arco-window-top, 34px))",
        borderRadius: 0,
        zIndex: win.z,
      }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

  if (win.minimized) return null;

  const titlebarClass = [
    "arco-window__titlebar",
    `arco-window__titlebar--align-${windowControlAlign}`,
    `arco-window__titlebar--style-${windowControlStyle}`,
  ].join(" ");

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
          className={titlebarClass}
          onPointerDown={onTitlePointerDown}
          onPointerMove={onTitlePointerMove}
          onPointerUp={onTitlePointerUp}
          onDoubleClick={() => toggleMaximize(win.id)}
        >
          <WindowControls
            controlStyle={windowControlStyle}
            onClose={() => close(win.id)}
            onMinimize={() => toggleMinimize(win.id)}
            onMaximize={() => toggleMaximize(win.id)}
          />
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
