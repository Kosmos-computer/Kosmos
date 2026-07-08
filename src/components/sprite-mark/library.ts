import customData from "./data/custom.json";
import builtInData from "./data/patterns.json";
import {
  mergeSpriteMarkLibraryJson,
  spriteMarkPatternFromJson,
  spriteMarkPatternToJson,
  spriteMarkSequenceFromJson,
  spriteMarkSequenceToJson,
} from "./codec";
import {
  SPRITE_GEOMETRIC_PATTERN_ENTRIES,
  SPRITE_MARK_BOOT_PATTERNS,
  spriteMarkBootGeometricStrings,
  spriteMarkEqualizerFrames,
  spriteMarkLogoPulseFrames,
  spriteMarkRingFrames,
} from "./patterns/geometric";
import type {
  SpriteMarkAnimation,
  SpriteMarkAnimationString,
  SpriteMarkLibraryJson,
  SpriteMarkMask,
  SpriteMarkPattern,
  SpriteMarkPlayback,
  SpriteMarkSequence,
  SpriteMarkSequenceId,
  SpriteMarkStatus,
} from "./types";

const BUILT_IN_DATA = builtInData as SpriteMarkLibraryJson;
const CUSTOM_DATA = customData as SpriteMarkLibraryJson;

const FRAME_MS = {
  default: 140,
  boot: 100,
  status: 160,
  text: 220,
  emoji: 180,
} as const;

function framesFromMasks(name: string, masks: readonly SpriteMarkMask[]) {
  return masks.map((mask, index) => ({ name: `${name} ${index}`, mask }));
}

function sequence(
  id: SpriteMarkSequenceId,
  name: string,
  frameMs: number,
  masks: readonly SpriteMarkMask[],
  loop = true,
): SpriteMarkSequence {
  return { id, name, frameMs, loop, frames: framesFromMasks(name, masks) };
}

function isBootLetterSequence(seq: SpriteMarkSequence): boolean {
  return seq.id.startsWith("word.") || seq.name.toLowerCase().includes("word ·");
}

function buildBootAnimationStrings(
  dataPatterns: readonly SpriteMarkPattern[],
  dataSequences: readonly SpriteMarkSequence[],
): readonly SpriteMarkAnimationString[] {
  const strings: SpriteMarkAnimationString[] = [...spriteMarkBootGeometricStrings()];

  for (const seq of dataSequences) {
    if (isBootLetterSequence(seq)) continue;
    strings.push({
      id: seq.id,
      name: seq.name,
      frames: seq.frames.map((frame) => frame.mask),
    });
  }

  const faces = dataPatterns.filter((pattern) => pattern.category === "faces");
  if (faces.length) {
    strings.push({
      id: "boot.faces",
      name: "faces",
      frames: faces.map((pattern) => pattern.mask),
    });
  }

  return strings;
}

function buildBootPool(
  dataPatterns: readonly SpriteMarkPattern[],
  dataSequences: readonly SpriteMarkSequence[],
): readonly SpriteMarkMask[] {
  const masks: SpriteMarkMask[] = [...SPRITE_MARK_BOOT_PATTERNS];

  for (const pattern of dataPatterns) {
    if (pattern.category === "faces" || pattern.category === "custom") {
      masks.push(pattern.mask);
    }
  }

  for (const seq of dataSequences) {
    if (isBootLetterSequence(seq)) continue;
    for (const frame of seq.frames) {
      masks.push(frame.mask);
    }
  }

  return masks;
}

function builtInSequences(patterns: ReadonlyMap<string, SpriteMarkPattern>): Map<string, SpriteMarkSequence> {
  const get = (id: string) => patterns.get(id)?.mask;
  const smile = get("face.smile");
  const grin = get("face.grin");
  const blink = get("face.blink");
  const wink = get("face.wink");
  const surprised = get("face.surprised");
  const neutral = get("face.neutral");

  const entries: SpriteMarkSequence[] = [
    sequence("boot-pulse", "boot pulse", FRAME_MS.boot, [...SPRITE_MARK_BOOT_POOL]),
    sequence("thinking", "thinking", FRAME_MS.status, spriteMarkEqualizerFrames()),
    sequence("connecting", "connecting", FRAME_MS.status, spriteMarkRingFrames()),
    sequence("idle", "idle", FRAME_MS.status, spriteMarkLogoPulseFrames()),
  ];

  if (smile && grin) {
    entries.push(sequence("success", "success", FRAME_MS.status, [smile, grin]));
    entries.push(sequence("happy", "happy", FRAME_MS.status, [smile, grin, blink ?? smile], true));
  }

  if (surprised && neutral) {
    entries.push(sequence("error", "error", FRAME_MS.status, [surprised, neutral], true));
  }

  if (smile && blink) {
    entries.push(sequence("blink", "blink", FRAME_MS.status, [smile, blink], true));
  }

  if (wink && smile) {
    entries.push(sequence("wink", "wink", FRAME_MS.status, [smile, wink], true));
  }

  return new Map(entries.map((entry) => [entry.id, entry]));
}

function loadDataPatterns(): SpriteMarkPattern[] {
  const bundle = mergeSpriteMarkLibraryJson(BUILT_IN_DATA, CUSTOM_DATA);
  return bundle.patterns.map(spriteMarkPatternFromJson);
}

function loadDataSequences(): SpriteMarkSequence[] {
  const bundle = mergeSpriteMarkLibraryJson(BUILT_IN_DATA, CUSTOM_DATA);
  return bundle.sequences.map(spriteMarkSequenceFromJson);
}

const dataPatterns = loadDataPatterns();
const dataSequences = loadDataSequences();
const patternMap = new Map<string, SpriteMarkPattern>();

for (const pattern of SPRITE_GEOMETRIC_PATTERN_ENTRIES) {
  patternMap.set(pattern.id, pattern);
}
for (const pattern of dataPatterns) {
  patternMap.set(pattern.id, pattern);
}

export const SPRITE_MARK_BOOT_POOL: readonly SpriteMarkMask[] = buildBootPool(
  dataPatterns,
  dataSequences,
);

export const SPRITE_MARK_BOOT_STRINGS: readonly SpriteMarkAnimationString[] =
  buildBootAnimationStrings(dataPatterns, dataSequences);

const sequenceMap = builtInSequences(patternMap);
for (const seq of dataSequences) {
  sequenceMap.set(seq.id, seq);
}

export const SPRITE_MARK_PATTERNS: readonly SpriteMarkPattern[] = [
  ...SPRITE_GEOMETRIC_PATTERN_ENTRIES,
  ...dataPatterns,
];

export const SPRITE_MARK_SEQUENCES: readonly SpriteMarkSequence[] = [...sequenceMap.values()];

export function getSpriteMarkPattern(id: string): SpriteMarkPattern | undefined {
  return patternMap.get(id);
}

export function getSpriteMarkSequence(id: string): SpriteMarkSequence | undefined {
  return sequenceMap.get(id);
}

const STATUS_SEQUENCE: Record<SpriteMarkStatus, SpriteMarkSequenceId | "working" | "boot"> = {
  idle: "idle",
  working: "working",
  thinking: "thinking",
  connecting: "connecting",
  success: "success",
  error: "error",
  happy: "happy",
  waiting: "blink",
};

export function resolveSpriteMarkPlayback(options: {
  animation?: SpriteMarkAnimation;
  status?: SpriteMarkStatus;
  sequenceId?: string;
  frameMs?: number;
}): SpriteMarkPlayback {
  const { animation = "working", status, sequenceId, frameMs } = options;

  if (sequenceId) {
    const seq = getSpriteMarkSequence(sequenceId);
    if (seq) {
      return { kind: "sequence", sequence: seq, frameMs: frameMs ?? seq.frameMs };
    }
  }

  if (status) {
    const mapped = STATUS_SEQUENCE[status];
    if (mapped === "working") {
      return { kind: "random-geometric", frameMs: frameMs ?? FRAME_MS.default };
    }
    if (mapped === "boot") {
      return { kind: "random-geometric", frameMs: frameMs ?? FRAME_MS.boot };
    }
    const seq = getSpriteMarkSequence(mapped);
    if (seq) {
      return { kind: "sequence", sequence: seq, frameMs: frameMs ?? seq.frameMs };
    }
  }

  if (animation === "working") {
    return { kind: "random-geometric", frameMs: frameMs ?? FRAME_MS.default };
  }

  if (animation === "boot") {
    return {
      kind: "random-strings",
      strings: SPRITE_MARK_BOOT_STRINGS,
      frameMs: frameMs ?? FRAME_MS.boot,
    };
  }

  const seq = getSpriteMarkSequence(animation);
  if (seq) {
    return { kind: "sequence", sequence: seq, frameMs: frameMs ?? seq.frameMs };
  }

  return { kind: "random-geometric", frameMs: frameMs ?? FRAME_MS.default };
}

/** Full library snapshot for the HTML lab (geometric + data patterns + sequences). */
export function exportSpriteMarkLibraryJson(): SpriteMarkLibraryJson {
  return {
    version: 1,
    patterns: SPRITE_MARK_PATTERNS.map(spriteMarkPatternToJson),
    sequences: SPRITE_MARK_SEQUENCES.map(spriteMarkSequenceToJson),
  };
}

/** Merge lab-exported custom entries into the runtime library. */
export function registerSpriteMarkLibraryJson(bundle: SpriteMarkLibraryJson): void {
  for (const entry of bundle.patterns) {
    const pattern = spriteMarkPatternFromJson(entry);
    patternMap.set(pattern.id, pattern);
  }
  for (const entry of bundle.sequences) {
    const seq = spriteMarkSequenceFromJson(entry);
    sequenceMap.set(seq.id, seq);
  }
}

export { FRAME_MS as SPRITE_MARK_FRAME_MS };
