import { spriteMarkPatternFromIndices } from "../spriteMarkSquares";
import type {
  SpriteMarkLibraryJson,
  SpriteMarkMask,
  SpriteMarkPattern,
  SpriteMarkPatternJson,
  SpriteMarkSequence,
  SpriteMarkSequenceJson,
} from "./types";

export function spriteMarkMaskFromIndices(indices: Iterable<number>): SpriteMarkMask {
  return spriteMarkPatternFromIndices(indices);
}

export function spriteMarkIndicesFromMask(mask: SpriteMarkMask): number[] {
  return mask.map((on, index) => (on ? index : -1)).filter((index) => index >= 0);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

export function spriteMarkPatternFromJson(entry: SpriteMarkPatternJson): SpriteMarkPattern {
  return {
    id: entry.id ?? `custom.${slugify(entry.name)}`,
    name: entry.name,
    category: entry.category,
    mask: spriteMarkMaskFromIndices(entry.indices),
  };
}

export function spriteMarkSequenceFromJson(entry: SpriteMarkSequenceJson): SpriteMarkSequence {
  return {
    id: entry.id ?? `custom.${slugify(entry.name)}`,
    name: entry.name,
    frameMs: entry.frameMs,
    loop: entry.loop,
    frames: entry.frames.map((frame) => ({
      name: frame.name,
      mask: spriteMarkMaskFromIndices(frame.indices),
    })),
  };
}

export function spriteMarkPatternToJson(pattern: SpriteMarkPattern): SpriteMarkPatternJson {
  return {
    id: pattern.id,
    name: pattern.name,
    category: pattern.category,
    indices: spriteMarkIndicesFromMask(pattern.mask),
  };
}

export function spriteMarkSequenceToJson(sequence: SpriteMarkSequence): SpriteMarkSequenceJson {
  return {
    id: sequence.id,
    name: sequence.name,
    frameMs: sequence.frameMs,
    loop: sequence.loop,
    frames: sequence.frames.map((frame) => ({
      name: frame.name,
      indices: spriteMarkIndicesFromMask(frame.mask),
    })),
  };
}

export function mergeSpriteMarkLibraryJson(
  ...bundles: readonly SpriteMarkLibraryJson[]
): SpriteMarkLibraryJson {
  const patterns: SpriteMarkPatternJson[] = [];
  const sequences: SpriteMarkSequenceJson[] = [];

  for (const bundle of bundles) {
    patterns.push(...bundle.patterns);
    sequences.push(...bundle.sequences);
  }

  return { version: 1, patterns, sequences };
}
