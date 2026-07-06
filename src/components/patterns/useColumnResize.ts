import { useCallback, useRef, useState } from "react";

export interface UseColumnResizeOptions {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  handleSide?: "left" | "right";
  disabled?: boolean;
}

/** Pointer-driven column resize for sidebar panes and split views. */
export function useColumnResize({
  value,
  onChange,
  min = 160,
  max = 560,
  handleSide = "right",
  disabled = false,
}: UseColumnResizeOptions) {
  const [isResizing, setIsResizing] = useState(false);
  const frameRef = useRef<number | null>(null);

  const clamp = useCallback((next: number) => Math.min(max, Math.max(min, next)), [max, min]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (disabled) return;
      event.preventDefault();
      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);

      const startX = event.clientX;
      const startWidth = value;
      setIsResizing(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      function onPointerMove(ev: PointerEvent) {
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(() => {
          const delta = ev.clientX - startX;
          const next = handleSide === "right" ? startWidth + delta : startWidth - delta;
          onChange(clamp(next));
        });
      }

      function onPointerUp(ev: PointerEvent) {
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        setIsResizing(false);
        target.releasePointerCapture(ev.pointerId);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      }

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [clamp, disabled, handleSide, onChange, value],
  );

  return { onPointerDown, isResizing };
}
