/**
 * useResizableSplit — pointer-drag resizing for the Studio's chat/drawer
 * split (the agent-canvas useResizablePanels pattern). Returns a pointerdown
 * handler for the divider; width lives in the studio store so it persists.
 *
 * `containerRef` must point at the chat+drawer split only (not the sidebar),
 * so the percentage matches the grip's visual position.
 */
import { useCallback, useState, type RefObject } from "react";
import { useStudioStore } from "./studioStore";

/** Chat pane share of the split, clamped so neither side collapses. */
const MIN_PCT = 25;
const MAX_PCT = 75;

export function useResizableSplit(containerRef: RefObject<HTMLDivElement | null>) {
  const setChatWidthPct = useStudioStore((s) => s.setChatWidthPct);
  const [isResizing, setIsResizing] = useState(false);

  const onDividerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const container = containerRef.current;
      if (!container) return;
      e.preventDefault();
      const handle = e.currentTarget;
      handle.setPointerCapture(e.pointerId);
      setIsResizing(true);
      const rect = container.getBoundingClientRect();

      const onMove = (ev: PointerEvent) => {
        const pct = ((ev.clientX - rect.left) / rect.width) * 100;
        setChatWidthPct(Math.min(MAX_PCT, Math.max(MIN_PCT, pct)));
      };
      const onUp = (ev: PointerEvent) => {
        setIsResizing(false);
        try {
          handle.releasePointerCapture(ev.pointerId);
        } catch {
          // Already released.
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [containerRef, setChatWidthPct],
  );

  return { onDividerPointerDown, isResizing };
}
