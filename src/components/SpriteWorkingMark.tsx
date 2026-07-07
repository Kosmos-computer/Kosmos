import { useEffect, useState } from "react";
import {
  SPRITE_MARK_GRID_SQUARES,
  SPRITE_MARK_VIEWBOX,
} from "./spriteMarkSquares";
import {
  pickRandomGeometricPatternIndex,
  SPRITE_GEOMETRIC_PATTERNS,
} from "./spriteMarkPatterns";

type SpriteWorkingMarkProps = {
  className?: string;
  /** Boot splash uses faster ticks. */
  mode?: "default" | "boot";
};

const DEFAULT_FRAME_MS = 140;
const BOOT_FRAME_MS = 100;

/** Animated logo mark — squares cycle through random geometric patterns. */
export function SpriteWorkingMark({ className = "", mode = "default" }: SpriteWorkingMarkProps) {
  const isBoot = mode === "boot";
  const [frame, setFrame] = useState(() => pickRandomGeometricPatternIndex());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrame((current) => pickRandomGeometricPatternIndex(current));
    }, isBoot ? BOOT_FRAME_MS : DEFAULT_FRAME_MS);

    return () => window.clearInterval(timer);
  }, [isBoot]);

  const pattern = SPRITE_GEOMETRIC_PATTERNS[frame];

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
