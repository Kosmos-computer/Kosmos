/**
 * HoverMenuBar — top-edge hover reveal for the menu bar in App View, ported from
 * Longformer's HoverStatusBar: rest at the top edge, peek a handle, then slide
 * the bar fully open after a short pause.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useDismiss } from "../components/useDismiss";

export interface HoverMenuBarProps {
  /** When false, children render unchanged (desktop view). */
  enabled?: boolean;
  /** Fires when the hover bar fully opens or closes. */
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

type BarPhase = "idle" | "peaked" | "open";

/** Hold time on the top edge before the bar fully reveals (matches Longformer HoverStatusBar). */
const PEAK_DELAY_MS = 520;

export function HoverMenuBar({ enabled = true, onOpenChange, children }: HoverMenuBarProps) {
  const [phase, setPhase] = useState<BarPhase>("idle");
  const openTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const barRef = useRef<HTMLDivElement>(null);

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

  useDismiss(phase !== "idle", dismiss, barRef);

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
        "arco-hover-menubar",
        phase === "peaked" && "arco-hover-menubar--peaked",
        phase === "open" && "arco-hover-menubar--open",
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseLeave={handleHoverLeave}
    >
      <div className="arco-hover-menubar__zone" onMouseEnter={handleHoverEnter} aria-hidden="true" />
      <div
        ref={barRef}
        className={[
          "arco-hover-menubar__tray",
          phase === "peaked" && "arco-hover-menubar__tray--peaked",
          phase === "open" && "arco-hover-menubar__tray--open",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="arco-hover-menubar__peak" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
