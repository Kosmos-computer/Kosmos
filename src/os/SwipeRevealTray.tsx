/**
 * SwipeRevealTray — top/bottom edge chrome that peeks on touch or hover, then
 * slides fully open after a deliberate drag. Edge taps alone do not open the
 * tray (avoids blocking the whole screen on accidental touches).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useDismiss } from "../components/useDismiss";

export interface SwipeRevealTrayProps {
  edge: "top" | "bottom";
  /** When false, children render inline without swipe chrome. */
  enabled?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Accessible label for the swipe zone. */
  zoneLabel?: string;
  children: ReactNode;
}

type TrayPhase = "idle" | "open";

const OPEN_DRAG_PX = 56;
const DRAG_START_PX = 10;

export function SwipeRevealTray({
  edge,
  enabled = true,
  onOpenChange,
  zoneLabel,
  children,
}: SwipeRevealTrayProps) {
  const [phase, setPhase] = useState<TrayPhase>("idle");
  const trayRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragging = useRef(false);

  const dismiss = useCallback(() => {
    dragStartY.current = null;
    dragging.current = false;
    setPhase("idle");
  }, []);

  useDismiss(phase === "open", dismiss, trayRef);

  useEffect(() => {
    if (!enabled) setPhase("idle");
  }, [enabled]);

  useEffect(() => {
    onOpenChange?.(enabled && phase === "open");
  }, [enabled, phase, onOpenChange]);

  function handleHoverEnter() {
    if (phase === "idle") setPhase("open");
  }

  function handleHoverLeave() {
    setPhase("idle");
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!enabled || phase === "open") return;
    dragStartY.current = e.clientY;
    dragging.current = false;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (dragStartY.current == null || phase === "open") return;
    const delta = e.clientY - dragStartY.current;
    if (!dragging.current && Math.abs(delta) < DRAG_START_PX) return;
    dragging.current = true;
    const towardOpen = edge === "top" ? delta > OPEN_DRAG_PX : delta < -OPEN_DRAG_PX;
    if (towardOpen) {
      dragStartY.current = null;
      dragging.current = false;
      setPhase("open");
    }
  }

  function handlePointerUp() {
    dragStartY.current = null;
    dragging.current = false;
  }

  function toggleOpen() {
    setPhase((current) => (current === "open" ? "idle" : "open"));
  }

  if (!enabled) return <>{children}</>;

  const rootClass = [
    "arco-swipe-tray",
    `arco-swipe-tray--${edge}`,
    phase === "open" && "arco-swipe-tray--open",
  ]
    .filter(Boolean)
    .join(" ");

  const trayClass = [
    "arco-swipe-tray__tray",
    phase === "open" && "arco-swipe-tray__tray--open",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} onMouseLeave={handleHoverLeave}>
      {phase === "open" ? (
        <button
          type="button"
          className="arco-swipe-tray__backdrop"
          aria-label="Close"
          onClick={dismiss}
        />
      ) : (
        <div
          className="arco-swipe-tray__zone"
          aria-label={zoneLabel}
          onMouseEnter={handleHoverEnter}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <button
            type="button"
            className="arco-swipe-tray__peak"
            aria-label={zoneLabel}
            onClick={(e) => {
              e.stopPropagation();
              toggleOpen();
            }}
          />
        </div>
      )}
      <div ref={trayRef} className={trayClass}>
        {children}
      </div>
    </div>
  );
}
