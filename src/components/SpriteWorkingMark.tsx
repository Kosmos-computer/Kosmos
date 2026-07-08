import { useMemo } from "react";
import {
  SPRITE_MARK_GRID_SQUARES,
  SPRITE_MARK_VIEWBOX,
} from "./spriteMarkSquares";
import {
  resolveSpriteMarkPlayback,
  spriteMarkEmojiPlayback,
  spriteMarkTextSequence,
  useSpriteMarkPlayer,
  type SpriteMarkAnimation,
  type SpriteMarkStatus,
} from "./sprite-mark";

type SpriteWorkingMarkProps = {
  className?: string;
  /** Preset playback — random geometric, boot speed, or a named library sequence. */
  animation?: SpriteMarkAnimation;
  /** Map UI/agent state to a library sequence. */
  status?: SpriteMarkStatus;
  /** Spell text using the glyph library (cycles one character at a time). */
  text?: string;
  /** Emoji or emoticon mapped to a face, glyph, or short sequence. */
  emoji?: string;
  /** Direct library sequence id (from lab export or `SPRITE_MARK_SEQUENCES`). */
  sequenceId?: string;
  frameMs?: number;
  /** @deprecated Use `animation="boot"` instead. */
  mode?: "default" | "boot";
};

/** Animated logo mark — driven by the sprite mark pattern library. */
export function SpriteWorkingMark({
  className = "",
  animation,
  status,
  text,
  emoji,
  sequenceId,
  frameMs,
  mode = "default",
}: SpriteWorkingMarkProps) {
  const playback = useMemo(() => {
    if (text) {
      const sequence = spriteMarkTextSequence(text, { frameMs });
      if (sequence) {
        return { kind: "sequence" as const, sequence, frameMs: sequence.frameMs };
      }
    }

    if (emoji) {
      const emojiPlayback = spriteMarkEmojiPlayback(emoji, frameMs);
      if (emojiPlayback) return emojiPlayback;
    }

    const resolvedAnimation =
      animation ?? (mode === "boot" ? "boot" : status === undefined ? "working" : undefined);

    return resolveSpriteMarkPlayback({
      animation: resolvedAnimation,
      status,
      sequenceId,
      frameMs,
    });
  }, [animation, emoji, frameMs, mode, sequenceId, status, text]);

  const mask = useSpriteMarkPlayer(playback);

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
          data-on={mask[index] ? "true" : "false"}
        />
      ))}
    </svg>
  );
}
