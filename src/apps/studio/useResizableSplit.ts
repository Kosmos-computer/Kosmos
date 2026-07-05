/**
 * useResizableSplit — pointer-drag resizing for the Studio's chat/drawer
 * split (the agent-canvas useResizablePanels pattern). Returns a pointerdown
 * handler for the divider; width lives in the studio store so it persists.
 */
import { useCallback, type RefObject } from "react";
import { useStudioStore } from "./studioStore";

/** Chat pane share of the split, clamped so neither side collapses. */
const MIN_PCT = 25;
const MAX_PCT = 75;

export function useResizableSplit(containerRef: RefObject<HTMLDivElement | null>) {
  const setChatWidthPct = useStudioStore((s) => s.setChatWidthPct);

  const onDividerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;
      e.preventDefault();
      const rect = container.getBoundingClientRect();

      const onMove = (ev: PointerEvent) => {
        const pct = ((ev.clientX - rect.left) / rect.width) * 100;
        setChatWidthPct(Math.min(MAX_PCT, Math.max(MIN_PCT, pct)));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [containerRef, setChatWidthPct],
  );

  return { onDividerPointerDown };
}
