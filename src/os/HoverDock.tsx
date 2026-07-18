/**
 * HoverDock — bottom-edge hover reveal for the dock in App View, ported from
 * Longformer's HoverAppTray: rest at the bottom edge, peek a handle, then
 * slide the dock fully open after a short pause.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useDismiss } from "../components/useDismiss";

export interface HoverDockProps {
  /** When false, children render unchanged (desktop view). */
  enabled?: boolean;
  /** Fires when the hover tray fully opens or closes. */
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

type DockPhase = "idle" | "peaked" | "open";

const PEAK_DELAY_MS = 480;

export function HoverDock({ enabled = true, onOpenChange, children }: HoverDockProps) {
  const [phase, setPhase] = useState<DockPhase>("idle");
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const trayRef = useRef<HTMLDivElement>(null);

  function clearOpenTimer() {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = undefined;
    }
  }

  const dismiss = useCallback(() => {
    clearOpenTimer();
    setPhase("idle");
  }, []);

  useDismiss(phase !== "idle", dismiss, trayRef);

  useEffect(() => {
    return () => clearOpenTimer();
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearOpenTimer();
      setPhase("idle");
    }
  }, [enabled]);

  useEffect(() => {
    onOpenChange?.(enabled && phase === "open");
  }, [enabled, phase, onOpenChange]);

  function handleHoverEnter() {
    if (phase !== "idle") return;
    setPhase("peaked");
    clearOpenTimer();
    openTimerRef.current = setTimeout(() => setPhase("open"), PEAK_DELAY_MS);
  }

  function handleHoverLeave() {
    clearOpenTimer();
    setPhase("idle");
  }

  if (!enabled) return <>{children}</>;

  return (
    <div
      className={[
        "arco-hover-dock",
        phase === "peaked" && "arco-hover-dock--peaked",
        phase === "open" && "arco-hover-dock--open",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseLeave={handleHoverLeave}
    >
      <div className="arco-hover-dock__zone" onMouseEnter={handleHoverEnter} aria-hidden="true" />
      <div
        ref={trayRef}
        className={[
          "arco-hover-dock__tray",
          phase === "peaked" && "arco-hover-dock__tray--peaked",
          phase === "open" && "arco-hover-dock__tray--open",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="arco-hover-dock__peak" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
