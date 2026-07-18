/**
 * On-screen keyboard IME facade.
 *
 * Layout locale picks a default engine; users can switch phonetic ↔ direct
 * (e.g. ローマ字 vs かな) without changing app i18n.
 */
import type { KeyboardLocale } from "../keyboardLayouts";
import { stepIme } from "./engines";
import { emptyImeState, type ImeEvent, type ImeId, type ImeState, type ImeStep } from "./types";

export type { ImeCandidate, ImeEvent, ImeId, ImeState, ImeStep } from "./types";
export {
  emptyImeState,
  imeUsesCompositionBar,
  isComposing,
  isDirectIme,
  isPhoneticIme,
} from "./types";
export { stepIme } from "./engines";
export { usePhysicalKeyboardBridge } from "./usePhysicalKeyboardBridge";

export function defaultImeIdForLocale(locale: KeyboardLocale): ImeId {
  if (locale === "ja") return "romaji-ja";
  if (locale === "zh-CN") return "pinyin-zh";
  return "none";
}

/** Alternate direct-entry grids for CJK (かな / 常用字). */
export function directImeIdForLocale(locale: KeyboardLocale): ImeId | null {
  if (locale === "ja") return "direct-ja";
  if (locale === "zh-CN") return "direct-zh";
  return null;
}

export function applyIme(state: ImeState, event: ImeEvent): ImeStep {
  return stepIme(state, event);
}

export function resetIme(imeId: ImeId): ImeState {
  return emptyImeState(imeId);
}

/** Labels for the globe menu IME style toggle. */
export function imeStyleLabel(imeId: ImeId): string {
  switch (imeId) {
    case "romaji-ja":
      return "ローマ字";
    case "direct-ja":
      return "かな";
    case "pinyin-zh":
      return "拼音";
    case "direct-zh":
      return "常用字";
    default:
      return "ABC";
  }
}
