import { useCallback, useRef, useState } from "react";

export interface PointerGestureOptions {
  disabled?: boolean;
  cursor?: string;
  onStart?: () => void;
  onMove: (deltaX: number, deltaY: number, event: PointerEvent) => void;
  onEnd?: () => void;
}

/** Shared pointer capture + RAF loop for bento tile drag and resize. */
export function usePointerGesture({ disabled = false, cursor, onStart, onMove, onEnd }: PointerGestureOptions) {
  const [active, setActive] = useState(false);
  const frameRef = useRef<number | null>(null);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (disabled) return;
      event.preventDefault();
      event.stopPropagation();

      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);

      const startX = event.clientX;
      const startY = event.clientY;
      setActive(true);
      onStart?.();

      if (cursor) {
        document.body.style.cursor = cursor;
        document.body.style.userSelect = "none";
      }

      function handlePointerMove(ev: PointerEvent) {
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(() => {
          onMove(ev.clientX - startX, ev.clientY - startY, ev);
        });
      }

      function handlePointerUp(ev: PointerEvent) {
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        setActive(false);
        onEnd?.();
        target.releasePointerCapture(ev.pointerId);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      }

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [cursor, disabled, onEnd, onMove, onStart],
  );

  return { onPointerDown, active };
}
