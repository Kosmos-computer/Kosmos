/** Shared geometry for the square-grid logo mark (105×75 viewBox). */
export const SPRITE_MARK_VIEWBOX = { width: 105, height: 75 } as const;

export const SPRITE_MARK_SQUARE_SIZE = 15;

const MARK_OFFSET_X = -138.004233;
const MARK_OFFSET_Y = -2724.911895;
const BASE_X = 168 + MARK_OFFSET_X;
const BASE_Y = 2756 + MARK_OFFSET_Y;

const MARK_TRANSFORMS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [15.004233, 13.911895],
  [15.004233, 28.911895],
  [30.004233, -1.088105],
  [44.887621, -15.971492],
  [44.887621, 14.028508],
  [59.887621, 29.028508],
  [15.004233, -16.088105],
  [15.004233, -31.088105],
  [60.004233, -31.088105],
  [60.004233, -1.088105],
  [-29.995767, -1.088105],
  [-29.995767, -31.088105],
  [-29.995767, 28.911895],
  [-14.995767, -16.088105],
  [-15.112379, 14.028508],
];

export type SpriteMarkSquare = {
  x: number;
  y: number;
  size: number;
};

export const SPRITE_MARK_SQUARES: readonly SpriteMarkSquare[] = MARK_TRANSFORMS.map(
  ([tx, ty]) => ({
    x: BASE_X + tx,
    y: BASE_Y + ty,
    size: SPRITE_MARK_SQUARE_SIZE,
  }),
);
