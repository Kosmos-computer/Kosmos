/** Boolean mask over the 7×5 sprite mark grid (35 cells, row-major). */
export type SpriteMarkMask = readonly boolean[];

export type SpriteMarkCategory =
  | "geometric"
  | "faces"
  | "glyphs"
  | "organic"
  | "status"
  | "custom";

export type SpriteMarkPattern = {
  id: string;
  name: string;
  category: SpriteMarkCategory;
  mask: SpriteMarkMask;
};

export type SpriteMarkFrame = {
  name: string;
  mask: SpriteMarkMask;
};

export type SpriteMarkSequence = {
  id: string;
  name: string;
  frameMs: number;
  loop?: boolean;
  frames: readonly SpriteMarkFrame[];
};

/** Named sequences registered in the sprite mark library. */
export type SpriteMarkSequenceId =
  | "boot-pulse"
  | "thinking"
  | "connecting"
  | "success"
  | "error"
  | "happy"
  | "idle"
  | "blink"
  | "wink";

/** Agent / UI status mapped to library sequences or random geometric cycling. */
export type SpriteMarkStatus =
  | "idle"
  | "working"
  | "thinking"
  | "connecting"
  | "success"
  | "error"
  | "happy"
  | "waiting";

export type SpriteMarkAnimation =
  | "working"
  | "boot"
  | SpriteMarkSequenceId;

export type SpriteMarkPlayback =
  | { kind: "random-geometric"; frameMs: number }
  | { kind: "random-pool"; pool: readonly SpriteMarkMask[]; frameMs: number }
  | { kind: "random-strings"; strings: readonly SpriteMarkAnimationString[]; frameMs: number }
  | { kind: "sequence"; sequence: SpriteMarkSequence; frameMs: number };

/** A run of related frames played in order before switching to another string. */
export type SpriteMarkAnimationString = {
  id: string;
  name: string;
  frames: readonly SpriteMarkMask[];
};

/** JSON shape for lab export / custom pattern drops. */
export type SpriteMarkLibraryJson = {
  version: number;
  patterns: readonly SpriteMarkPatternJson[];
  sequences: readonly SpriteMarkSequenceJson[];
};

export type SpriteMarkPatternJson = {
  id?: string;
  name: string;
  category: SpriteMarkCategory;
  indices: readonly number[];
};

export type SpriteMarkSequenceJson = {
  id?: string;
  name: string;
  frameMs: number;
  loop?: boolean;
  frames: readonly { name: string; indices: readonly number[] }[];
};
