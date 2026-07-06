import shared from "../styles/shared.module.css";

type IsometricTileProps = {
  variant: number;
};

const LIGHT = { top: "#e5e5e5", left: "#737373", right: "#a3a3a3" };
const DARK = { top: "#d4d4d4", left: "#404040", right: "#525252" };

function cube(x: number, y: number, size: number, colors: typeof LIGHT) {
  const h = size * 0.55;
  return (
    <g key={`${x}-${y}`}>
      <polygon
        points={`${x},${y + h} ${x + size},${y + h - size * 0.35} ${x + size},${y + h + size * 0.25} ${x},${y + h + size * 0.6}`}
        fill={colors.right}
      />
      <polygon
        points={`${x - size},${y + h} ${x},${y + h + size * 0.6} ${x},${y + h} ${x - size},${y + h - size * 0.35}`}
        fill={colors.left}
      />
      <polygon
        points={`${x - size},${y + h - size * 0.35} ${x},${y + h} ${x + size},${y + h - size * 0.35} ${x},${y + h - size * 0.7}`}
        fill={colors.top}
      />
    </g>
  );
}

export function IsometricTile({ variant }: IsometricTileProps) {
  const warmIndex = variant % 3;
  const cubes = [
    { x: 85, y: 30, size: 13, colors: LIGHT },
    { x: 72, y: 44, size: 13, colors: LIGHT },
    { x: 98, y: 38, size: 13, colors: warmIndex === 0 ? DARK : LIGHT },
    { x: 59, y: 50, size: 13, colors: LIGHT },
    { x: 111, y: 46, size: 13, colors: warmIndex === 1 ? DARK : LIGHT },
    { x: 85, y: 58, size: 13, colors: LIGHT },
    { x: 72, y: 72, size: 13, colors: warmIndex === 2 ? DARK : LIGHT },
  ];

  return (
    <svg
      viewBox="0 0 170 110"
      className={shared.isometric}
      aria-hidden="true"
    >
      {cubes.map((cubeDef) => cube(cubeDef.x, cubeDef.y, cubeDef.size, cubeDef.colors))}
    </svg>
  );
}
