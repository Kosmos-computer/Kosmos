/**
 * Maps physical KeyboardEvents onto on-screen keyboard key ids so the OSK
 * can light up the matching keys while the user types.
 */
import {
  KEY_ALT,
  KEY_BACKSPACE,
  KEY_CAPS,
  KEY_CTRL,
  KEY_ENTER,
  KEY_ESC,
  KEY_META,
  KEY_SHIFT,
  KEY_SPACE,
  KEY_TAB,
  keyboardKeyId,
  type KeyboardKey,
} from "./keyboardLayouts";

const CODE_TO_CHAR: Record<string, string> = {
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
};

function charFromCode(code: string): string | null {
  if (code.startsWith("Key") && code.length === 4) return code.slice(3).toLowerCase();
  if (code.startsWith("Digit") && code.length === 6) return code.slice(5);
  return CODE_TO_CHAR[code] ?? null;
}

/** Keyboard key ids that should highlight for this physical event. */
export function highlightIdsForEvent(event: KeyboardEvent): string[] {
  const { key, code } = event;
  const ids = new Set<string>();

  if (/^F([1-9]|1[0-2])$/.test(key)) {
    ids.add(key);
  } else if (key === "Escape") {
    ids.add(KEY_ESC);
  } else if (key === "Tab") {
    ids.add(KEY_TAB);
  } else if (key === "CapsLock") {
    ids.add(KEY_CAPS);
  } else if (key === "Shift" || code.startsWith("Shift")) {
    ids.add(KEY_SHIFT);
  } else if (key === "Control" || code.startsWith("Control")) {
    ids.add(KEY_CTRL);
  } else if (key === "Alt" || code.startsWith("Alt")) {
    ids.add(KEY_ALT);
  } else if (key === "Meta" || key === "OS" || code.startsWith("Meta") || code.startsWith("OS")) {
    ids.add(KEY_META);
  } else if (key === "Backspace") {
    ids.add(KEY_BACKSPACE);
  } else if (key === "Enter") {
    ids.add(KEY_ENTER);
  } else if (key === " " || key === "Spacebar") {
    ids.add(KEY_SPACE);
  } else if (key.length === 1) {
    ids.add(key.toLowerCase());
  }

  // Prefer the physical key position (Digit1 while Shift is held → highlight "1").
  const fromCode = charFromCode(code);
  if (fromCode) ids.add(fromCode);

  return [...ids];
}

export function isKeyPhysicallyPressed(key: KeyboardKey, pressedIds: ReadonlySet<string>): boolean {
  return pressedIds.has(keyboardKeyId(key));
}
