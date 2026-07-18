/**
 * Pure IME steppers — one per `ImeId`.
 * Passthrough / direct modes insert immediately; phonetic modes compose.
 */
import { JA_READING_CANDIDATES, ZH_PINYIN_CANDIDATES, candidatesForReading } from "./dictionaries";
import { flushRomaji, romajiToHiragana } from "./romajiTable";
import {
  emptyImeState,
  type ImeCandidate,
  type ImeEvent,
  type ImeState,
  type ImeStep,
} from "./types";

function toCandidates(texts: string[], reading?: string): ImeCandidate[] {
  return texts.map((text, i) => ({
    id: `${reading ?? text}-${i}`,
    text,
    reading: reading && reading !== text ? reading : undefined,
  }));
}

function withCandidates(state: ImeState, reading: string, dict: Record<string, string[]>): ImeState {
  const texts = candidatesForReading(dict, reading);
  // Always offer committing the raw composition itself as the last option.
  const surfaces = texts.includes(reading) || !reading ? texts : [...texts, reading];
  return {
    ...state,
    candidates: toCandidates(surfaces, reading || undefined),
    selectedIndex: 0,
  };
}

function commitSelected(state: ImeState): ImeStep {
  if (state.candidates.length > 0) {
    const text = state.candidates[state.selectedIndex]?.text ?? state.preedit;
    return { state: emptyImeState(state.imeId), commit: text, handled: true };
  }
  if (state.preedit || state.raw) {
    const text = state.preedit || state.raw;
    return { state: emptyImeState(state.imeId), commit: text, handled: true };
  }
  return { state, handled: false };
}

/** Latin / direct glyph modes — every character commits immediately. */
function stepPassthrough(state: ImeState, event: ImeEvent): ImeStep {
  switch (event.type) {
    case "char":
      return { state: emptyImeState(state.imeId), commit: event.value, handled: true };
    case "reset":
    case "escape":
      return { state: emptyImeState(state.imeId), handled: true };
    default:
      return { state, handled: false };
  }
}

function stepRomajiJa(state: ImeState, event: ImeEvent): ImeStep {
  switch (event.type) {
    case "reset":
      return { state: emptyImeState(state.imeId), handled: true };

    case "escape":
      if (state.raw || state.preedit) {
        return { state: emptyImeState(state.imeId), handled: true };
      }
      return { state, handled: false };

    case "select": {
      const pick = state.candidates[event.index];
      if (!pick) return { state, handled: true };
      return { state: emptyImeState(state.imeId), commit: pick.text, handled: true };
    }

    case "backspace": {
      if (!state.raw && !state.preedit) return { state, handled: false };
      if (state.raw.length > 0) {
        const raw = state.raw.slice(0, -1);
        const { hiragana, rest } = romajiToHiragana(raw);
        const preedit = hiragana + rest;
        return {
          state: withCandidates({ ...state, raw, preedit }, hiragana, JA_READING_CANDIDATES),
          handled: true,
        };
      }
      const preedit = state.preedit.slice(0, -1);
      return {
        state: withCandidates({ ...state, raw: "", preedit }, preedit, JA_READING_CANDIDATES),
        handled: true,
      };
    }

    case "char": {
      if (event.value.length !== 1) {
        return { state: emptyImeState(state.imeId), commit: event.value, handled: true };
      }
      // Digits pick candidates when composing.
      if (/^[1-9]$/.test(event.value) && state.candidates.length > 0) {
        const index = Number(event.value) - 1;
        const pick = state.candidates[index];
        if (pick) {
          return { state: emptyImeState(state.imeId), commit: pick.text, handled: true };
        }
      }
      if (!/^[a-zA-Z'-]$/.test(event.value)) {
        // Punctuation: flush composition then insert the char.
        if (state.raw || state.preedit) {
          const flushed = flushRomaji(state.raw || state.preedit);
          return {
            state: emptyImeState(state.imeId),
            commit: flushed + event.value,
            handled: true,
          };
        }
        return { state, commit: event.value, handled: true };
      }
      const raw = state.raw + event.value.toLowerCase();
      const { hiragana, rest } = romajiToHiragana(raw);
      const preedit = hiragana + rest;
      return {
        state: withCandidates({ ...state, raw, preedit }, hiragana, JA_READING_CANDIDATES),
        handled: true,
      };
    }

    case "space": {
      if (!state.raw && !state.preedit) return { state, handled: false };
      // Space commits the highlighted candidate (tap strip to change selection).
      if (state.candidates.length > 0) return commitSelected(state);
      const text = flushRomaji(state.raw || state.preedit);
      return { state: emptyImeState(state.imeId), commit: text, handled: true };
    }

    case "enter": {
      if (!state.raw && !state.preedit) return { state, handled: false };
      if (state.candidates.length > 0) return commitSelected(state);
      const text = flushRomaji(state.raw || state.preedit);
      return { state: emptyImeState(state.imeId), commit: text, handled: true };
    }

    default:
      return { state, handled: false };
  }
}

function stepPinyinZh(state: ImeState, event: ImeEvent): ImeStep {
  switch (event.type) {
    case "reset":
      return { state: emptyImeState(state.imeId), handled: true };

    case "escape":
      if (state.raw || state.preedit) {
        return { state: emptyImeState(state.imeId), handled: true };
      }
      return { state, handled: false };

    case "select": {
      const pick = state.candidates[event.index];
      if (!pick) return { state, handled: true };
      return { state: emptyImeState(state.imeId), commit: pick.text, handled: true };
    }

    case "backspace": {
      if (!state.raw) return { state, handled: false };
      const raw = state.raw.slice(0, -1);
      return {
        state: withCandidates({ ...state, raw, preedit: raw }, raw, ZH_PINYIN_CANDIDATES),
        handled: true,
      };
    }

    case "char": {
      if (event.value.length !== 1) {
        return { state: emptyImeState(state.imeId), commit: event.value, handled: true };
      }
      if (/^[1-9]$/.test(event.value) && state.candidates.length > 0) {
        const index = Number(event.value) - 1;
        const pick = state.candidates[index];
        if (pick) {
          return { state: emptyImeState(state.imeId), commit: pick.text, handled: true };
        }
      }
      if (!/^[a-zA-Z]$/.test(event.value)) {
        if (state.raw) {
          const pick = state.candidates[state.selectedIndex]?.text ?? state.preedit;
          return {
            state: emptyImeState(state.imeId),
            commit: pick + event.value,
            handled: true,
          };
        }
        return { state, commit: event.value, handled: true };
      }
      const raw = state.raw + event.value.toLowerCase();
      return {
        state: withCandidates({ ...state, raw, preedit: raw }, raw, ZH_PINYIN_CANDIDATES),
        handled: true,
      };
    }

    case "space": {
      if (!state.raw) return { state, handled: false };
      if (state.candidates.length > 1) {
        // Space commits the highlighted candidate (mobile pinyin style).
        return commitSelected(state);
      }
      if (state.candidates.length === 1) return commitSelected(state);
      return { state: emptyImeState(state.imeId), commit: state.preedit, handled: true };
    }

    case "enter": {
      if (!state.raw) return { state, handled: false };
      if (state.candidates.length > 0) return commitSelected(state);
      return { state: emptyImeState(state.imeId), commit: state.preedit, handled: true };
    }

    default:
      return { state, handled: false };
  }
}

export function stepIme(state: ImeState, event: ImeEvent): ImeStep {
  if (event.type === "reset") {
    return { state: emptyImeState(state.imeId), handled: true };
  }

  switch (state.imeId) {
    case "romaji-ja":
      return stepRomajiJa(state, event);
    case "pinyin-zh":
      return stepPinyinZh(state, event);
    case "direct-ja":
    case "direct-zh":
    case "none":
    default:
      return stepPassthrough(state, event);
  }
}
