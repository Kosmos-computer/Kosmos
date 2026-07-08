import { getSpriteMarkPattern, getSpriteMarkSequence } from "./library";
import { spriteMarkTextSequence } from "./text";
import type { SpriteMarkPlayback, SpriteMarkSequence } from "./types";

/** Map emoji / emoticon shortcuts to a pattern or short sequence. */
const EMOJI_PATTERN: Record<string, string> = {
  "♥": "glyph.heart",
  "❤": "glyph.heart",
  "❤️": "glyph.heart",
  ":)": "face.smile",
  ":-)": "face.smile",
  ":D": "face.grin",
  ";)": "face.wink",
  ";-)": "face.wink",
  ":o": "face.surprised",
  ":O": "face.surprised",
  ":|": "face.neutral",
  "zZ": "face.sleep",
  "💤": "face.sleep",
  "😊": "face.smile",
  "😁": "face.grin",
  "😉": "face.wink",
  "😮": "face.surprised",
  "😴": "face.sleep",
  "🙂": "face.smile",
};

const EMOJI_SEQUENCE: Record<string, string> = {
  "👀": "blink",
  "✨": "happy",
  "⚡": "thinking",
  "🔌": "connecting",
  "✅": "success",
  "❌": "error",
};

const DEFAULT_EMOJI_FRAME_MS = 180;

export function spriteMarkEmojiPlayback(
  emoji: string,
  frameMs = DEFAULT_EMOJI_FRAME_MS,
): SpriteMarkPlayback | undefined {
  const trimmed = emoji.trim();
  if (!trimmed) return undefined;

  const sequenceId = EMOJI_SEQUENCE[trimmed];
  if (sequenceId) {
    const sequence = getSpriteMarkSequence(sequenceId);
    if (sequence) {
      return { kind: "sequence", sequence, frameMs: frameMs ?? sequence.frameMs };
    }
  }

  const patternId = EMOJI_PATTERN[trimmed];
  if (patternId) {
    const pattern = getSpriteMarkPattern(patternId);
    if (pattern) {
      const sequence: SpriteMarkSequence = {
        id: `emoji.${trimmed}`,
        name: `emoji · ${trimmed}`,
        frameMs,
        loop: true,
        frames: [{ name: trimmed, mask: pattern.mask }],
      };
      return { kind: "sequence", sequence, frameMs };
    }
  }

  // Fall back to spelling short emoticon text (e.g. "HI", "OK")
  if (/^[A-Za-z!?.♥❤]+$/.test(trimmed)) {
    const sequence = spriteMarkTextSequence(trimmed, { frameMs });
    if (sequence) {
      return { kind: "sequence", sequence, frameMs: sequence.frameMs };
    }
  }

  return undefined;
}

export function registerSpriteMarkEmoji(pattern: Record<string, string>): void {
  Object.assign(EMOJI_PATTERN, pattern);
}

export function registerSpriteMarkEmojiSequence(sequences: Record<string, string>): void {
  Object.assign(EMOJI_SEQUENCE, sequences);
}
