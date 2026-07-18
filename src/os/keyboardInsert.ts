function isEditableElement(element: Element | null): element is HTMLElement {
  if (!element || !(element instanceof HTMLElement)) return false;
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly;
  }
  return element.isContentEditable;
}

export function captureEditableTarget(): HTMLElement | null {
  const active = document.activeElement;
  return isEditableElement(active) ? active : null;
}

function dispatchInput(element: HTMLElement): void {
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

export function insertAtTarget(target: HTMLElement | null, text: string): void {
  const element = target && isEditableElement(target) ? target : captureEditableTarget();
  if (!element) return;

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;
    element.value = `${element.value.slice(0, start)}${text}${element.value.slice(end)}`;
    const next = start + text.length;
    element.selectionStart = next;
    element.selectionEnd = next;
    dispatchInput(element);
    return;
  }

  if (element.isContentEditable) {
    element.focus();
    if (document.execCommand("insertText", false, text)) {
      dispatchInput(element);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    dispatchInput(element);
  }
}

export function backspaceAtTarget(target: HTMLElement | null): void {
  const element = target && isEditableElement(target) ? target : captureEditableTarget();
  if (!element) return;

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    if (start !== end) {
      element.value = `${element.value.slice(0, start)}${element.value.slice(end)}`;
      element.selectionStart = start;
      element.selectionEnd = start;
    } else if (start > 0) {
      element.value = `${element.value.slice(0, start - 1)}${element.value.slice(end)}`;
      const next = start - 1;
      element.selectionStart = next;
      element.selectionEnd = next;
    } else {
      return;
    }
    dispatchInput(element);
    return;
  }

  if (element.isContentEditable) {
    element.focus();
    if (document.execCommand("delete", false)) {
      dispatchInput(element);
    }
  }
}

export function enterAtTarget(target: HTMLElement | null): void {
  insertAtTarget(target, "\n");
}

export type ChordModifiers = {
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
  shift?: boolean;
};

function eventCodeForKey(key: string): string {
  if (/^F([1-9]|1[0-2])$/.test(key)) return key;
  if (key.length === 1 && /[a-z]/i.test(key)) return `Key${key.toUpperCase()}`;
  if (key.length === 1 && /[0-9]/.test(key)) return `Digit${key}`;
  if (key === " ") return "Space";
  if (key === "Tab" || key === "Escape" || key === "Enter" || key === "Backspace") return key;
  return key;
}

/** Dispatch a synthetic key chord (for sticky Ctrl/Alt/Meta + letter / F-keys). */
export function dispatchChordAtTarget(
  target: HTMLElement | null,
  key: string,
  mods: ChordModifiers,
): boolean {
  const element = target && isEditableElement(target) ? target : captureEditableTarget();
  if (!element) return false;

  const code = eventCodeForKey(key);
  const keyCode =
    key.length === 1
      ? key.toUpperCase().charCodeAt(0)
      : key === "Tab"
        ? 9
        : key === "Escape"
          ? 27
          : key === "Enter"
            ? 13
            : key === "Backspace"
              ? 8
              : /^F([1-9]|1[0-2])$/.test(key)
                ? 111 + Number(key.slice(1))
                : 0;

  const init: KeyboardEventInit = {
    key,
    code,
    keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
    ctrlKey: Boolean(mods.ctrl),
    altKey: Boolean(mods.alt),
    metaKey: Boolean(mods.meta),
    shiftKey: Boolean(mods.shift),
  };

  element.focus();
  const down = new KeyboardEvent("keydown", init);
  const press = new KeyboardEvent("keypress", init);
  const up = new KeyboardEvent("keyup", init);
  element.dispatchEvent(down);
  if (!down.defaultPrevented && key.length === 1) element.dispatchEvent(press);
  element.dispatchEvent(up);
  return down.defaultPrevented;
}

/** Tab — prefer a real Tab event; fall back to inserting a tab character. */
export function tabAtTarget(target: HTMLElement | null, mods: ChordModifiers = {}): void {
  const element = target && isEditableElement(target) ? target : captureEditableTarget();
  if (!element) return;
  const prevented = dispatchChordAtTarget(element, "Tab", mods);
  if (prevented) return;
  if (!mods.ctrl && !mods.alt && !mods.meta) {
    insertAtTarget(element, "\t");
  }
}

export function escapeAtTarget(target: HTMLElement | null, mods: ChordModifiers = {}): void {
  dispatchChordAtTarget(target, "Escape", mods);
}
