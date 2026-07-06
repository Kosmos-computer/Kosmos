/** Square-grid mark for Agent Studio (105×105 viewBox). */
export const STUDIO_MARK_VIEWBOX = { width: 105, height: 105 } as const;

const STUDIO_MARK_SQUARES: ReadonlyArray<{
  x: number;
  y: number;
  width: number;
  height: number;
}> = [
  { x: 15, y: 0, width: 75, height: 15 },
  { x: 0, y: 15, width: 15, height: 75 },
  { x: 90, y: 15, width: 15, height: 75 },
  { x: 15, y: 90, width: 75, height: 15 },
  { x: 30, y: 30, width: 15, height: 45 },
  { x: 60, y: 30, width: 15, height: 45 },
];

type StudioLogoMarkProps = {
  className?: string;
  /** Accessible label; omit or pass empty string when decorative. */
  title?: string;
};

/** Square Kosmos mark used in Agent Studio chrome. */
export function StudioLogoMark({ className, title = "Agent Studio" }: StudioLogoMarkProps) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${STUDIO_MARK_VIEWBOX.width} ${STUDIO_MARK_VIEWBOX.height}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <g fill="currentColor">
        {STUDIO_MARK_SQUARES.map((square, index) => (
          <rect
            key={index}
            x={square.x}
            y={square.y}
            width={square.width}
            height={square.height}
          />
        ))}
      </g>
    </svg>
  );
}
