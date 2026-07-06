import { SPRITE_MARK_SQUARES, SPRITE_MARK_VIEWBOX } from "./spriteMarkSquares";

type LogoMarkProps = {
  className?: string;
  /** Accessible label; omit or pass empty string when decorative. */
  title?: string;
};

/** Square-grid mark paths — embed inside a larger logo SVG or use via LogoMark. */
export function LogoMarkGraphic() {
  return (
    <g fill="currentColor">
      {SPRITE_MARK_SQUARES.map((square, index) => (
        <rect
          key={index}
          x={square.x}
          y={square.y}
          width={square.size}
          height={square.size}
        />
      ))}
    </g>
  );
}

/** Square-grid logo mark — standalone icon for boot splash, favicons, etc. */
export function LogoMark({ className, title = "Arco" }: LogoMarkProps) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${SPRITE_MARK_VIEWBOX.width} ${SPRITE_MARK_VIEWBOX.height}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <LogoMarkGraphic />
    </svg>
  );
}
