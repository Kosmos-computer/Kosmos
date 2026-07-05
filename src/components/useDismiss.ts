/**
 * useDismiss — shared "close this popover" behavior: a pointerdown outside
 * the anchored element or an Escape keypress invokes the close callback.
 * Extracted so every dropdown/popover (Menu, emoji picker, usage popover)
 * dismisses identically instead of re-rolling listeners per component.
 */
import { useEffect, type RefObject } from "react";

export function useDismiss(
  open: boolean,
  onDismiss: () => void,
  ref: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return;

    // Capture phase so a click that also opens another popover still closes
    // this one before the new target handles it.
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onDismiss, ref]);
}
