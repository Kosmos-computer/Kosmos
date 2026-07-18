/**
 * When the on-screen keyboard is open, keep hardware typing wired to the
 * remembered editable target — and feed phonetic IMEs so composition /
 * Backspace / Space / Enter update the candidate bar instead of the field.
 */
import { useEffect } from "react";
import {
  backspaceAtTarget,
  captureEditableTarget,
  enterAtTarget,
  insertAtTarget,
} from "../keyboardInsert";
import { useInputMethodStore } from "../inputMethodStore";
import { isComposing, isPhoneticIme, type ImeEvent } from "./index";

function isEditableElement(element: Element | null): element is HTMLElement {
  if (!element || !(element instanceof HTMLElement)) return false;
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly;
  }
  return element.isContentEditable;
}

function imeEventFromKeyboard(event: KeyboardEvent): ImeEvent | null {
  if (event.key === "Backspace") return { type: "backspace" };
  if (event.key === "Escape") return { type: "escape" };
  if (event.key === "Enter") return { type: "enter" };
  if (event.key === " ") return { type: "space" };
  if (event.key.length === 1) return { type: "char", value: event.key };
  return null;
}

function shouldCaptureForIme(event: KeyboardEvent, composing: boolean): boolean {
  if (event.isComposing) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;

  const imeEvent = imeEventFromKeyboard(event);
  if (!imeEvent) return false;

  if (imeEvent.type === "backspace" || imeEvent.type === "escape") return composing;
  if (imeEvent.type === "space" || imeEvent.type === "enter") return composing;
  if (imeEvent.type === "char") {
    if (/^[1-9]$/.test(imeEvent.value)) return composing;
    if (/^[a-zA-Z']$/.test(imeEvent.value)) return true;
    return composing;
  }
  return false;
}

/**
 * @param enabled — typically true whenever the floating OSK is mounted.
 */
export function usePhysicalKeyboardBridge(enabled: boolean): void {
  const feedIme = useInputMethodStore((s) => s.feedIme);
  const refreshTarget = useInputMethodStore((s) => s.refreshTarget);

  useEffect(() => {
    if (!enabled) return;

    function resolveTarget(): HTMLElement | null {
      refreshTarget();
      const state = useInputMethodStore.getState();
      if (state.lastTarget && isEditableElement(state.lastTarget)) return state.lastTarget;
      return captureEditableTarget();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;

      const state = useInputMethodStore.getState();
      const phonetic = isPhoneticIme(state.imeId) && state.mode === "letters";
      const composing = isComposing(state.ime);

      // ── Phonetic IME: own composition keys so they don't hit the field ──
      if (phonetic && shouldCaptureForIme(event, composing)) {
        const imeEvent = imeEventFromKeyboard(event);
        if (!imeEvent) return;
        resolveTarget();
        const { commit, handled } = feedIme(imeEvent);
        if (!handled) return;
        event.preventDefault();
        event.stopPropagation();
        if (commit) insertAtTarget(useInputMethodStore.getState().lastTarget, commit);
        return;
      }

      // ── Focus lost: still type into the last editable the OSK remembers ──
      const active = document.activeElement;
      if (isEditableElement(active)) return;
      if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = resolveTarget();
      if (!target) return;

      if (event.key === "Backspace") {
        event.preventDefault();
        event.stopPropagation();
        backspaceAtTarget(target);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        enterAtTarget(target);
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        insertAtTarget(target, " ");
        return;
      }
      if (event.key.length === 1) {
        event.preventDefault();
        event.stopPropagation();
        insertAtTarget(target, event.key);
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, feedIme, refreshTarget]);
}
