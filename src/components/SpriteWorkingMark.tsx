import { useEffect, useState } from "react";
import {
  SPRITE_MARK_SQUARES,
  SPRITE_MARK_VIEWBOX,
} from "./spriteMarkSquares";

type SpriteWorkingMarkProps = {
  className?: string;
};

const SQUARE_COUNT = SPRITE_MARK_SQUARES.length;

/** Bitmasks cycled while the agent is working — wave, checker, sweep, pulse. */
const WORKING_PATTERNS: readonly (readonly boolean[])[] = [
  Array.from({ length: SQUARE_COUNT }, () => true),
  [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1].map(Boolean),
  [0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0].map(Boolean),
  [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1].map(Boolean),
  [0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0].map(Boolean),
  ...Array.from({ length: SQUARE_COUNT }, (_, index) =>
    Array.from({ length: SQUARE_COUNT }, (_, square) => square === index),
  ),
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1].map(Boolean),
  [0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0].map(Boolean),
];

const FRAME_MS = 180;

/** Animated logo mark — squares blink in sequence beside "Working…". */
export function SpriteWorkingMark({ className = "" }: SpriteWorkingMarkProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % WORKING_PATTERNS.length);
    }, FRAME_MS);

    return () => window.clearInterval(timer);
  }, []);

  const pattern = WORKING_PATTERNS[frame];

  return (
    <svg
      className={["sprite-working-mark", className].filter(Boolean).join(" ")}
      viewBox={`0 0 ${SPRITE_MARK_VIEWBOX.width} ${SPRITE_MARK_VIEWBOX.height}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {SPRITE_MARK_SQUARES.map((square, index) => (
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
