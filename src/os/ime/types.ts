/**
 * Shared IME types for the on-screen keyboard.
 *
 * Engines are pure steppers: (state, event) → { state, commit? }.
 * New scripts (Hangul, Zhuyin, …) plug in via `ImeId` + a stepper —
 * the OSK bar only reads `ImeState`.
 */

export type ImeId = "none" | "romaji-ja" | "pinyin-zh" | "direct-ja" | "direct-zh";

export type ImeCandidate = {
  id: string;
  text: string;
  /** Optional reading / annotation shown under or beside the candidate. */
  reading?: string;
};

export type ImeState = {
  imeId: ImeId;
  /** Raw keystrokes still awaiting conversion (romaji / pinyin). */
  raw: string;
  /** What the user sees in the composition strip. */
  preedit: string;
  candidates: ImeCandidate[];
  selectedIndex: number;
};

export type ImeEvent =
  | { type: "char"; value: string }
  | { type: "backspace" }
  | { type: "space" }
  | { type: "enter" }
  | { type: "escape" }
  | { type: "select"; index: number }
  | { type: "reset" };

export type ImeStep = {
  state: ImeState;
  /** Text to insert into the focused field, if any. */
  commit?: string;
  /**
   * When true the OSK must not also insert the original key
   * (composition handled it, or a commit already ran).
   */
  handled: boolean;
};

export function emptyImeState(imeId: ImeId = "none"): ImeState {
  return {
    imeId,
    raw: "",
    preedit: "",
    candidates: [],
    selectedIndex: 0,
  };
}

export function isComposing(state: ImeState): boolean {
  return state.raw.length > 0 || state.preedit.length > 0 || state.candidates.length > 0;
}

/** Phonetic IMEs that need a Latin key grid + composition bar. */
export function isPhoneticIme(imeId: ImeId): boolean {
  return imeId === "romaji-ja" || imeId === "pinyin-zh";
}

/** Direct glyph grids (かな / 常用字) — passthrough, no composition bar. */
export function isDirectIme(imeId: ImeId): boolean {
  return imeId === "direct-ja" || imeId === "direct-zh";
}

export function imeUsesCompositionBar(imeId: ImeId): boolean {
  return isPhoneticIme(imeId);
}
