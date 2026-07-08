import { create } from "zustand";
import { captureEditableTarget } from "./keyboardInsert";

const STORAGE_KEY = "arco:input-method-open";

function loadOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

interface InputMethodStore {
  open: boolean;
  shift: boolean;
  lastTarget: HTMLElement | null;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setShift: (shift: boolean) => void;
  toggleShift: () => void;
  rememberTarget: (target: HTMLElement | null) => void;
  refreshTarget: () => void;
}

export const useInputMethodStore = create<InputMethodStore>((set, get) => ({
  open: loadOpen(),
  shift: false,
  lastTarget: null,
  setOpen: (open) => {
    localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
    set({ open, shift: open ? get().shift : false });
    if (open) set({ lastTarget: captureEditableTarget() });
  },
  toggleOpen: () => get().setOpen(!get().open),
  setShift: (shift) => set({ shift }),
  toggleShift: () => set({ shift: !get().shift }),
  rememberTarget: (target) => set({ lastTarget: target }),
  refreshTarget: () => set({ lastTarget: captureEditableTarget() }),
}));
