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
