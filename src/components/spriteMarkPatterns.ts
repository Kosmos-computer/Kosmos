import {
  SPRITE_MARK_GRID_COLS,
  SPRITE_MARK_GRID_COUNT,
  SPRITE_MARK_GRID_ROWS,
  SPRITE_MARK_LOGO_INDICES,
  spriteMarkGridCoords,
  spriteMarkLogoPattern,
  spriteMarkPatternFromIndices,
} from "./spriteMarkSquares";

const CENTER_COL = Math.floor(SPRITE_MARK_GRID_COLS / 2);
const CENTER_ROW = Math.floor(SPRITE_MARK_GRID_ROWS / 2);

function patternFromPredicate(
  predicate: (col: number, row: number, index: number) => boolean,
): boolean[] {
  return Array.from({ length: SPRITE_MARK_GRID_COUNT }, (_, index) => {
    const { col, row } = spriteMarkGridCoords(index);
    return predicate(col, row, index);
  });
}

function diagonalSweepPatterns(): boolean[][] {
  const maxSum = SPRITE_MARK_GRID_COLS - 1 + SPRITE_MARK_GRID_ROWS - 1;
  return Array.from({ length: maxSum + 1 }, (_, sum) =>
    patternFromPredicate((col, row) => col + row === sum),
  );
}

function antiDiagonalSweepPatterns(): boolean[][] {
  const minDelta = -(SPRITE_MARK_GRID_ROWS - 1);
  const maxDelta = SPRITE_MARK_GRID_COLS - 1;
  return Array.from({ length: maxDelta - minDelta + 1 }, (_, offset) => {
    const delta = minDelta + offset;
    return patternFromPredicate((col, row) => col - row === delta);
  });
}

function diamondPatterns(inclusive = true): boolean[][] {
  const maxRadius =
    Math.max(
      CENTER_COL,
      SPRITE_MARK_GRID_COLS - 1 - CENTER_COL,
      CENTER_ROW,
      SPRITE_MARK_GRID_ROWS - 1 - CENTER_ROW,
    ) + 1;

  return Array.from({ length: maxRadius + 1 }, (_, radius) =>
    patternFromPredicate((col, row) => {
      const distance = Math.abs(col - CENTER_COL) + Math.abs(row - CENTER_ROW);
      return inclusive ? distance <= radius : distance === radius;
    }),
  );
}

function ringPatterns(): boolean[][] {
  return diamondPatterns(false);
}

function borderPattern(): boolean[] {
  return patternFromPredicate(
    (col, row) =>
      col === 0 ||
      row === 0 ||
      col === SPRITE_MARK_GRID_COLS - 1 ||
      row === SPRITE_MARK_GRID_ROWS - 1,
  );
}

function crossPattern(): boolean[] {
  return patternFromPredicate((col, row) => col === CENTER_COL || row === CENTER_ROW);
}

function xPattern(): boolean[] {
  return patternFromPredicate((col, row) => {
    return col - row === CENTER_COL - CENTER_ROW || col + row === CENTER_COL + CENTER_ROW;
  });
}

function wavePatterns(): boolean[][] {
  return Array.from({ length: 8 }, (_, phase) =>
    patternFromPredicate((col, row) => (col + row + phase) % 4 === 0),
  );
}

function equalizerPatterns(): boolean[][] {
  const barHeights = [2, 4, 5, 3, 5, 4, 2];
  return Array.from({ length: 6 }, (_, phase) =>
    patternFromPredicate((col, row) => {
      const baseHeight = barHeights[col] ?? 3;
      const height = ((baseHeight + phase + col) % SPRITE_MARK_GRID_ROWS) + 1;
      return row >= SPRITE_MARK_GRID_ROWS - height;
    }),
  );
}

function logoPulsePatterns(): boolean[][] {
  return [
    spriteMarkLogoPattern(),
    patternFromPredicate((col, row, index) => {
      if (SPRITE_MARK_LOGO_INDICES.has(index)) return true;
      const distance = Math.abs(col - CENTER_COL) + Math.abs(row - CENTER_ROW);
      return distance <= 2;
    }),
    spriteMarkPatternFromIndices(
      Array.from({ length: SPRITE_MARK_GRID_COUNT }, (_, index) => index),
    ),
    patternFromPredicate((_, __, index) => !SPRITE_MARK_LOGO_INDICES.has(index)),
  ];
}

function quadrantPatterns(): boolean[][] {
  return [
    patternFromPredicate((col, row) => col < CENTER_COL && row < CENTER_ROW),
    patternFromPredicate((col, row) => col > CENTER_COL && row < CENTER_ROW),
    patternFromPredicate((col, row) => col < CENTER_COL && row > CENTER_ROW),
    patternFromPredicate((col, row) => col > CENTER_COL && row > CENTER_ROW),
  ];
}

function alternatingBandPatterns(): boolean[][] {
  return [
    patternFromPredicate((col) => col % 2 === 0),
    patternFromPredicate((col) => col % 2 === 1),
    patternFromPredicate((_, row) => row % 2 === 0),
    patternFromPredicate((_, row) => row % 2 === 1),
  ];
}

/** Structured geometric frames — sweeps, symmetries, and fills. No random noise. */
export const SPRITE_GEOMETRIC_PATTERNS: readonly (readonly boolean[])[] = [
  spriteMarkLogoPattern(),
  spriteMarkPatternFromIndices(
    Array.from({ length: SPRITE_MARK_GRID_COUNT }, (_, index) => index),
  ),
  patternFromPredicate((col, row) => (col + row) % 2 === 0),
  patternFromPredicate((col, row) => (col + row) % 2 === 1),
  ...Array.from({ length: SPRITE_MARK_GRID_ROWS }, (_, row) =>
    patternFromPredicate((_, currentRow) => currentRow === row),
  ),
  ...Array.from({ length: SPRITE_MARK_GRID_COLS }, (_, col) =>
    patternFromPredicate((currentCol) => currentCol === col),
  ),
  ...diagonalSweepPatterns(),
  ...antiDiagonalSweepPatterns(),
  borderPattern(),
  crossPattern(),
  xPattern(),
  ...diamondPatterns(true),
  ...ringPatterns(),
  ...quadrantPatterns(),
  ...alternatingBandPatterns(),
  ...wavePatterns(),
  ...equalizerPatterns(),
  ...logoPulsePatterns(),
  patternFromPredicate((col, row) => row === 0 || row === SPRITE_MARK_GRID_ROWS - 1),
  patternFromPredicate((col, row) => col === 0 || col === SPRITE_MARK_GRID_COLS - 1),
  patternFromPredicate(
    (col, row) =>
      (col === 0 || col === SPRITE_MARK_GRID_COLS - 1) &&
      (row === 0 || row === SPRITE_MARK_GRID_ROWS - 1),
  ),
];

/** @deprecated Use SPRITE_GEOMETRIC_PATTERNS */
export const SPRITE_WORKING_PATTERNS = SPRITE_GEOMETRIC_PATTERNS;

/** Pick a random geometric pattern, avoiding an immediate repeat when possible. */
export function pickRandomGeometricPatternIndex(previousIndex?: number): number {
  const count = SPRITE_GEOMETRIC_PATTERNS.length;
  if (count <= 1) return 0;
  if (previousIndex === undefined) {
    return Math.floor(Math.random() * count);
  }

  let next = Math.floor(Math.random() * (count - 1));
  if (next >= previousIndex) next += 1;
  return next;
}

/** @deprecated Use pickRandomGeometricPatternIndex */
export const pickRandomSpritePatternIndex = pickRandomGeometricPatternIndex;
