/** Shared geometry for the square-grid logo mark (105×75 viewBox, 7×5 cells). */
export const SPRITE_MARK_VIEWBOX = { width: 105, height: 75 } as const;

export const SPRITE_MARK_SQUARE_SIZE = 15;

export const SPRITE_MARK_GRID_COLS = 7;

export const SPRITE_MARK_GRID_ROWS = 5;

export const SPRITE_MARK_GRID_COUNT =
  SPRITE_MARK_GRID_COLS * SPRITE_MARK_GRID_ROWS;

export type SpriteMarkSquare = {
  x: number;
  y: number;
  size: number;
};

/** Row-major index for a cell in the mark grid. */
export function spriteMarkGridIndex(col: number, row: number): number {
  return row * SPRITE_MARK_GRID_COLS + col;
}

export function spriteMarkGridCoords(index: number): { col: number; row: number } {
  return {
    col: index % SPRITE_MARK_GRID_COLS,
    row: Math.floor(index / SPRITE_MARK_GRID_COLS),
  };
}

/** Every cell in the 7×5 mark grid — use for sprite animations. */
export const SPRITE_MARK_GRID_SQUARES: readonly SpriteMarkSquare[] = Array.from(
  { length: SPRITE_MARK_GRID_COUNT },
  (_, index) => {
    const { col, row } = spriteMarkGridCoords(index);
    return {
      x: col * SPRITE_MARK_SQUARE_SIZE,
      y: row * SPRITE_MARK_SQUARE_SIZE,
      size: SPRITE_MARK_SQUARE_SIZE,
    };
  },
);

/** Grid coordinates that form the static Kosmos mark (A-shaped). */
const SPRITE_MARK_LOGO_CELLS: readonly Readonly<[number, number]>[] = [
  [0, 0],
  [3, 0],
  [6, 0],
  [1, 1],
  [3, 1],
  [5, 1],
  [0, 2],
  [2, 2],
  [4, 2],
  [6, 2],
  [1, 3],
  [3, 3],
  [5, 3],
  [0, 4],
  [3, 4],
  [6, 4],
];

export const SPRITE_MARK_LOGO_INDICES: ReadonlySet<number> = new Set(
  SPRITE_MARK_LOGO_CELLS.map(([col, row]) => spriteMarkGridIndex(col, row)),
);

/** Logo-only squares — use for static marks, favicons, and icons. */
export const SPRITE_MARK_SQUARES: readonly SpriteMarkSquare[] =
  SPRITE_MARK_GRID_SQUARES.filter((_, index) => SPRITE_MARK_LOGO_INDICES.has(index));

/** Build a boolean mask over the full grid from active cell indices. */
export function spriteMarkPatternFromIndices(
  activeIndices: Iterable<number>,
): boolean[] {
  const active = new Set(activeIndices);
  return Array.from({ length: SPRITE_MARK_GRID_COUNT }, (_, index) => active.has(index));
}

/** Mask with only the static logo cells lit. */
export function spriteMarkLogoPattern(): boolean[] {
  return spriteMarkPatternFromIndices(SPRITE_MARK_LOGO_INDICES);
}
