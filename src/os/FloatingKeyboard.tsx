import { useEffect } from "react";
import { OnScreenKeyboard } from "../components/patterns/OnScreenKeyboard";
import { captureEditableTarget } from "./keyboardInsert";
import { useInputMethodStore } from "./inputMethodStore";

function isEditableElement(element: Element | null): element is HTMLElement {
  if (!element || !(element instanceof HTMLElement)) return false;
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly;
  }
  return element.isContentEditable;
}

export function FloatingKeyboard() {
  const open = useInputMethodStore((s) => s.open);
  const rememberTarget = useInputMethodStore((s) => s.rememberTarget);

  useEffect(() => {
    if (!open) return;

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null;
      if (isEditableElement(target)) rememberTarget(target);
    };

    const onSelectionChange = () => {
      const target = captureEditableTarget();
      if (target) rememberTarget(target);
    };

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("selectionchange", onSelectionChange);
    rememberTarget(captureEditableTarget());

    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [open, rememberTarget]);

  if (!open) return null;

  return (
    <div className="arco-floating-keyboard" role="complementary" aria-live="polite">
      <OnScreenKeyboard />
    </div>
  );
}
