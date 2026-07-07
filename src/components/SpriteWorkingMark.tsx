import { useEffect, useState } from "react";
import {
  SPRITE_MARK_GRID_SQUARES,
  SPRITE_MARK_VIEWBOX,
} from "./spriteMarkSquares";
import { SPRITE_WORKING_PATTERNS } from "./spriteMarkPatterns";

type SpriteWorkingMarkProps = {
  className?: string;
};

const FRAME_MS = 140;

/** Animated logo mark — squares blink in sequence beside "Working…". */
export function SpriteWorkingMark({ className = "" }: SpriteWorkingMarkProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % SPRITE_WORKING_PATTERNS.length);
    }, FRAME_MS);

    return () => window.clearInterval(timer);
  }, []);

  const pattern = SPRITE_WORKING_PATTERNS[frame];

  return (
    <svg
      className={["sprite-working-mark", className].filter(Boolean).join(" ")}
      viewBox={`0 0 ${SPRITE_MARK_VIEWBOX.width} ${SPRITE_MARK_VIEWBOX.height}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {SPRITE_MARK_GRID_SQUARES.map((square, index) => (
        <rect
          key={index}
          className="sprite-working-mark__square"
          x={square.x}
          y={square.y}
          width={square.size}
          height={square.size}
          data-on={pattern[index] ? "true" : "false"}
        />
      ))}
    </svg>
  );
}
