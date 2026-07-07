import {
  SPRITE_MARK_GRID_COLS,
  SPRITE_MARK_GRID_COUNT,
  SPRITE_MARK_GRID_ROWS,
  SPRITE_MARK_LOGO_INDICES,
  spriteMarkGridCoords,
  spriteMarkGridIndex,
  spriteMarkLogoPattern,
  spriteMarkPatternFromIndices,
} from "./spriteMarkSquares";

const LOGO_INDICES = [...SPRITE_MARK_LOGO_INDICES];

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

function spiralIndices(): number[] {
  const order: number[] = [];
  let top = 0;
  let bottom = SPRITE_MARK_GRID_ROWS - 1;
  let left = 0;
  let right = SPRITE_MARK_GRID_COLS - 1;

  while (top <= bottom && left <= right) {
    for (let col = left; col <= right; col += 1) {
      order.push(spriteMarkGridIndex(col, top));
    }
    top += 1;

    for (let row = top; row <= bottom; row += 1) {
      order.push(spriteMarkGridIndex(right, row));
    }
    right -= 1;

    if (top <= bottom) {
      for (let col = right; col >= left; col -= 1) {
        order.push(spriteMarkGridIndex(col, bottom));
      }
      bottom -= 1;
    }

    if (left <= right) {
      for (let row = bottom; row >= top; row -= 1) {
        order.push(spriteMarkGridIndex(left, row));
      }
      left += 1;
    }
  }

  return order;
}

function chaseWithTrail(indices: number[], trail = 2): boolean[][] {
  return indices.map((activeIndex, frame) => {
    const lit = new Set<number>();
    for (let offset = 0; offset <= trail; offset += 1) {
      const index = indices[(frame - offset + indices.length) % indices.length];
      lit.add(index);
    }
    return spriteMarkPatternFromIndices(lit);
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
    const { col: centerCol, row: centerRow } = { col: CENTER_COL, row: CENTER_ROW };
    return col - row === centerCol - centerRow || col + row === centerCol + centerRow;
  });
}

function columnRainPatterns(): boolean[][] {
  return Array.from({ length: SPRITE_MARK_GRID_COLS }, (_, phase) =>
    patternFromPredicate((col, row) => {
      const drop = (row + phase) % SPRITE_MARK_GRID_ROWS;
      return col === phase && row >= drop;
    }),
  );
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

function logoRipplePatterns(): boolean[][] {
  return Array.from({ length: 6 }, (_, phase) =>
    patternFromPredicate((col, row, index) => {
      if (SPRITE_MARK_LOGO_INDICES.has(index)) return true;
      return (col + row + phase) % 3 === 0;
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

const SPIRAL_ORDER = spiralIndices();

/** Bitmasks cycled while the agent is working — logo, sweeps, chases, ripples, and fills. */
export const SPRITE_WORKING_PATTERNS: readonly (readonly boolean[])[] = [
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
  ...columnRainPatterns(),
  ...wavePatterns(),
  ...equalizerPatterns(),
  ...logoRipplePatterns(),
  ...logoPulsePatterns(),
  ...LOGO_INDICES.map((activeIndex) => spriteMarkPatternFromIndices([activeIndex])),
  ...chaseWithTrail(SPIRAL_ORDER, 2),
  ...chaseWithTrail(
    Array.from({ length: SPRITE_MARK_GRID_COUNT }, (_, index) => index),
    1,
  ),
  spriteMarkPatternFromIndices([0, 6, 28, 34]),
  spriteMarkPatternFromIndices([0, 3, 6, 28, 31, 34]),
  patternFromPredicate((col, row) => row === 0 || row === SPRITE_MARK_GRID_ROWS - 1),
  patternFromPredicate((col, row) => col === 0 || col === SPRITE_MARK_GRID_COLS - 1),
  patternFromPredicate(
    (col, row) =>
      (col === 0 || col === SPRITE_MARK_GRID_COLS - 1) &&
      (row === 0 || row === SPRITE_MARK_GRID_ROWS - 1),
  ),
];

const LOGO_LIT_COUNT = SPRITE_MARK_LOGO_INDICES.size;

/** Library patterns that visibly use the full grid (exclude static-logo and single-cell frames). */
export const SPRITE_DRAMATIC_PATTERN_INDICES: readonly number[] = SPRITE_WORKING_PATTERNS.map(
  (pattern, index) => ({ index, lit: pattern.filter(Boolean).length }),
)
  .filter(({ lit }) => lit !== LOGO_LIT_COUNT && lit !== 1 && lit !== 0)
  .map(({ index }) => index);

/** Procedural pattern — random cells across the entire grid. */
export function createRandomSpritePattern(density = 0.42): boolean[] {
  return Array.from({ length: SPRITE_MARK_GRID_COUNT }, () => Math.random() < density);
}

function patternsEqual(left: readonly boolean[], right: readonly boolean[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** Boot splash pattern — mixes procedural noise with dramatic library frames. */
export function pickRandomBootPattern(previous?: readonly boolean[]): boolean[] {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate =
      Math.random() < 0.6
        ? createRandomSpritePattern(0.28 + Math.random() * 0.44)
        : [...SPRITE_WORKING_PATTERNS[
            SPRITE_DRAMATIC_PATTERN_INDICES[
              Math.floor(Math.random() * SPRITE_DRAMATIC_PATTERN_INDICES.length)
            ] ?? 0
          ]];

    if (!previous || !patternsEqual(previous, candidate)) {
      return candidate;
    }
  }

  return createRandomSpritePattern();
}

/** Pick a random pattern index, avoiding an immediate repeat when possible. */
export function pickRandomSpritePatternIndex(previousIndex?: number): number {
  const count = SPRITE_WORKING_PATTERNS.length;
  if (count <= 1) return 0;
  if (previousIndex === undefined) {
    return Math.floor(Math.random() * count);
  }

  let next = Math.floor(Math.random() * (count - 1));
  if (next >= previousIndex) next += 1;
  return next;
}
