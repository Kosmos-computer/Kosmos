import { getSpriteMarkPattern } from "./library";
import type { SpriteMarkSequence } from "./types";

const GLYPH_ALIASES: Record<string, string> = {
  A: "glyph.A",
  B: "glyph.B",
  C: "glyph.C",
  G: "glyph.G",
  H: "glyph.H",
  I: "glyph.I",
  N: "glyph.N",
  O: "glyph.O",
  R: "glyph.R",
  S: "glyph.S",
  "!": "glyph.exclaim",
  "·": "glyph.dot",
  ".": "glyph.dot",
  "♥": "glyph.heart",
  "❤": "glyph.heart",
  "❤️": "glyph.heart",
};

const DEFAULT_TEXT_FRAME_MS = 220;
const DEFAULT_TEXT_HOLD_MS = 120;

function glyphPatternForChar(char: string) {
  const upper = char.toUpperCase();
  const id = GLYPH_ALIASES[char] ?? GLYPH_ALIASES[upper];
  return id ? getSpriteMarkPattern(id) : undefined;
}

/** Spell text one glyph at a time across the 7×5 grid. */
export function spriteMarkTextSequence(
  text: string,
  options?: { frameMs?: number; holdMs?: number; id?: string; name?: string },
): SpriteMarkSequence | undefined {
  const cleaned = text.trim();
  if (!cleaned) return undefined;

  const frameMs = options?.frameMs ?? DEFAULT_TEXT_FRAME_MS;
  const holdMs = options?.holdMs ?? DEFAULT_TEXT_HOLD_MS;
  const frames = [];

  for (const char of cleaned) {
    const pattern = glyphPatternForChar(char);
    if (!pattern) continue;
    frames.push({ name: char, mask: pattern.mask });
    if (holdMs > 0) {
      frames.push({ name: `${char} hold`, mask: pattern.mask });
    }
  }

  if (!frames.length) return undefined;

  return {
    id: options?.id ?? `text.${cleaned.toLowerCase().replace(/[^a-z0-9]+/g, ".")}`,
    name: options?.name ?? `text · ${cleaned}`,
    frameMs,
    loop: true,
    frames,
  };
}

export function spriteMarkSupportedTextChars(): string[] {
  return Object.keys(GLYPH_ALIASES);
}
