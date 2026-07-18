import { create } from "zustand";
import { DEFAULT_LOCALE } from "../i18n";
import {
  applyIme,
  defaultImeIdForLocale,
  directImeIdForLocale,
  emptyImeState,
  isDirectIme,
  isPhoneticIme,
  resetIme,
  type ImeEvent,
  type ImeId,
  type ImeState,
} from "./ime";
import { captureEditableTarget } from "./keyboardInsert";
import {
  resolveKeyboardLocale,
  type KeyboardLocale,
  type KeyboardMode,
} from "./keyboardLayouts";

const OPEN_KEY = "arco:input-method-open";
const LAYOUT_KEY = "arco:input-method-layout";
const IME_KEY = "arco:input-method-ime";
const MODIFIERS_KEY = "arco:input-method-modifiers";
const FUNCTION_KEYS_KEY = "arco:input-method-function-keys";

function loadOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

function loadShowModifiers(): boolean {
  try {
    return localStorage.getItem(MODIFIERS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Default on — full layouts expect an Esc/F-key row; compact can turn it off. */
function loadShowFunctionKeys(): boolean {
  try {
    const stored = localStorage.getItem(FUNCTION_KEYS_KEY);
    if (stored === null) return true;
    return stored === "1";
  } catch {
    return true;
  }
}

function loadLayoutLocale(): KeyboardLocale {
  try {
    const stored = localStorage.getItem(LAYOUT_KEY);
    if (stored) return resolveKeyboardLocale(stored);
  } catch {
    // fall through
  }
  try {
    const htmlLang = document.documentElement.lang;
    if (htmlLang) return resolveKeyboardLocale(htmlLang);
  } catch {
    // fall through
  }
  return resolveKeyboardLocale(DEFAULT_LOCALE);
}

function isImeId(value: string | null): value is ImeId {
  return (
    value === "none" ||
    value === "romaji-ja" ||
    value === "pinyin-zh" ||
    value === "direct-ja" ||
    value === "direct-zh"
  );
}

function loadImeId(layoutLocale: KeyboardLocale): ImeId {
  try {
    const stored = localStorage.getItem(IME_KEY);
    if (isImeId(stored)) {
      // Ignore a stored engine that doesn't belong to the current layout.
      if (stored === "none" && (layoutLocale === "ja" || layoutLocale === "zh-CN")) {
        return defaultImeIdForLocale(layoutLocale);
      }
      if (layoutLocale === "ja" && (stored === "romaji-ja" || stored === "direct-ja")) return stored;
      if (layoutLocale === "zh-CN" && (stored === "pinyin-zh" || stored === "direct-zh")) {
        return stored;
      }
      if (stored === "none" && layoutLocale !== "ja" && layoutLocale !== "zh-CN") return stored;
    }
  } catch {
    // fall through
  }
  return defaultImeIdForLocale(layoutLocale);
}

interface InputMethodStore {
  open: boolean;
  shift: boolean;
  caps: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
  /** When true, ⌃/⌥/⌘ (or Ctrl/Alt/Win) appear on the bottom row. */
  showModifiers: boolean;
  /** When true, Esc + F1–F12 row is shown (also default for full density). */
  showFunctionKeys: boolean;
  /** Keyboard layout locale — independent of app i18n (no shell refresh). */
  layoutLocale: KeyboardLocale;
  /** Active IME engine — phonetic composition, direct glyph grid, or none. */
  imeId: ImeId;
  ime: ImeState;
  mode: KeyboardMode;
  lastTarget: HTMLElement | null;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setShift: (shift: boolean) => void;
  toggleShift: () => void;
  toggleCaps: () => void;
  toggleCtrl: () => void;
  toggleAlt: () => void;
  toggleMeta: () => void;
  clearChordModifiers: () => void;
  setShowModifiers: (show: boolean) => void;
  toggleShowModifiers: () => void;
  setShowFunctionKeys: (show: boolean) => void;
  toggleShowFunctionKeys: () => void;
  setLayoutLocale: (locale: string) => void;
  setImeId: (imeId: ImeId) => void;
  /** Toggle phonetic ↔ direct for the current CJK layout. */
  toggleImeStyle: () => void;
  setMode: (mode: KeyboardMode) => void;
  rememberTarget: (target: HTMLElement | null) => void;
  refreshTarget: () => void;
  /** Feed a key into the IME; returns text to insert (if any) and whether handled. */
  feedIme: (event: ImeEvent) => { commit?: string; handled: boolean };
  clearIme: () => void;
}

const initialLocale = loadLayoutLocale();
const initialImeId = loadImeId(initialLocale);

export const useInputMethodStore = create<InputMethodStore>((set, get) => ({
  open: loadOpen(),
  shift: false,
  caps: false,
  ctrl: false,
  alt: false,
  meta: false,
  showModifiers: loadShowModifiers(),
  showFunctionKeys: loadShowFunctionKeys(),
  layoutLocale: initialLocale,
  imeId: initialImeId,
  ime: emptyImeState(initialImeId),
  mode: "letters",
  lastTarget: null,
  setOpen: (open) => {
    localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    set({
      open,
      shift: open ? get().shift : false,
      caps: open ? get().caps : false,
      ctrl: open ? get().ctrl : false,
      alt: open ? get().alt : false,
      meta: open ? get().meta : false,
      mode: open ? get().mode : "letters",
      ime: open ? get().ime : resetIme(get().imeId),
    });
    if (open) set({ lastTarget: captureEditableTarget() });
  },
  toggleOpen: () => get().setOpen(!get().open),
  setShift: (shift) => set({ shift }),
  toggleShift: () => set({ shift: !get().shift }),
  toggleCaps: () => set({ caps: !get().caps, shift: false }),
  toggleCtrl: () => set({ ctrl: !get().ctrl }),
  toggleAlt: () => set({ alt: !get().alt }),
  toggleMeta: () => set({ meta: !get().meta }),
  clearChordModifiers: () => set({ ctrl: false, alt: false, meta: false, shift: false }),
  setShowModifiers: (showModifiers) => {
    localStorage.setItem(MODIFIERS_KEY, showModifiers ? "1" : "0");
    set({
      showModifiers,
      ctrl: showModifiers ? get().ctrl : false,
      alt: showModifiers ? get().alt : false,
      meta: showModifiers ? get().meta : false,
    });
  },
  toggleShowModifiers: () => get().setShowModifiers(!get().showModifiers),
  setShowFunctionKeys: (showFunctionKeys) => {
    localStorage.setItem(FUNCTION_KEYS_KEY, showFunctionKeys ? "1" : "0");
    set({ showFunctionKeys });
  },
  toggleShowFunctionKeys: () => get().setShowFunctionKeys(!get().showFunctionKeys),
  setLayoutLocale: (locale) => {
    const layoutLocale = resolveKeyboardLocale(locale);
    const imeId = defaultImeIdForLocale(layoutLocale);
    localStorage.setItem(LAYOUT_KEY, layoutLocale);
    localStorage.setItem(IME_KEY, imeId);
    set({
      layoutLocale,
      imeId,
      ime: emptyImeState(imeId),
      shift: false,
      mode: "letters",
    });
  },
  setImeId: (imeId) => {
    localStorage.setItem(IME_KEY, imeId);
    set({ imeId, ime: emptyImeState(imeId), shift: false, mode: "letters" });
  },
  toggleImeStyle: () => {
    const { layoutLocale, imeId } = get();
    const direct = directImeIdForLocale(layoutLocale);
    if (!direct) return;
    if (isPhoneticIme(imeId)) {
      get().setImeId(direct);
    } else if (isDirectIme(imeId)) {
      get().setImeId(defaultImeIdForLocale(layoutLocale));
    } else {
      get().setImeId(defaultImeIdForLocale(layoutLocale));
    }
  },
  setMode: (mode) =>
    set({
      mode,
      shift: false,
      // Drop in-progress composition when leaving the letter page.
      ime: mode === "letters" ? get().ime : resetIme(get().imeId),
    }),
  rememberTarget: (target) => set({ lastTarget: target }),
  refreshTarget: () => set({ lastTarget: captureEditableTarget() }),
  feedIme: (event) => {
    const step = applyIme(get().ime, event);
    set({ ime: step.state });
    return { commit: step.commit, handled: step.handled };
  },
  clearIme: () => set({ ime: resetIme(get().imeId) }),
}));
