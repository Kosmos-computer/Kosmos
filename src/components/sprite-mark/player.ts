import { useEffect, useState } from "react";
import {
  pickRandomGeometricPatternIndex,
  pickRandomMaskIndex,
  SPRITE_GEOMETRIC_PATTERNS,
} from "./patterns/geometric";
import type { SpriteMarkMask, SpriteMarkPlayback } from "./types";

function playbackKey(playback: SpriteMarkPlayback): string {
  if (playback.kind === "random-geometric") {
    return `geometric:${playback.frameMs}`;
  }
  if (playback.kind === "random-pool") {
    return `pool:${playback.frameMs}:${playback.pool.length}`;
  }
  if (playback.kind === "random-strings") {
    return `strings:${playback.frameMs}:${playback.strings.length}`;
  }
  return `sequence:${playback.sequence.id}:${playback.frameMs}:${playback.sequence.frames.length}`;
}

export function useSpriteMarkPlayer(playback: SpriteMarkPlayback) {
  const [mask, setMask] = useState<SpriteMarkMask>(() => SPRITE_GEOMETRIC_PATTERNS[0]);
  const key = playbackKey(playback);

  useEffect(() => {
    if (playback.kind === "random-geometric") {
      let frame = pickRandomGeometricPatternIndex();
      setMask(SPRITE_GEOMETRIC_PATTERNS[frame]);

      const timer = window.setInterval(() => {
        frame = pickRandomGeometricPatternIndex(frame);
        setMask(SPRITE_GEOMETRIC_PATTERNS[frame]);
      }, playback.frameMs);

      return () => window.clearInterval(timer);
    }

    if (playback.kind === "random-pool") {
      const { pool, frameMs } = playback;
      if (!pool.length) return;

      let frame = pickRandomMaskIndex(pool.length);
      setMask(pool[frame]);

      const timer = window.setInterval(() => {
        frame = pickRandomMaskIndex(pool.length, frame);
        setMask(pool[frame]);
      }, frameMs);

      return () => window.clearInterval(timer);
    }

    if (playback.kind === "random-strings") {
      const { strings, frameMs } = playback;
      const playable = strings.filter((entry) => entry.frames.length > 0);
      if (!playable.length) return;

      let stringIndex = pickRandomMaskIndex(playable.length);
      let frameIndex = 0;
      setMask(playable[stringIndex].frames[0]);

      const timer = window.setInterval(() => {
        const current = playable[stringIndex];
        frameIndex += 1;

        if (frameIndex >= current.frames.length) {
          stringIndex = pickRandomMaskIndex(playable.length, stringIndex);
          frameIndex = 0;
        }

        setMask(playable[stringIndex].frames[frameIndex]);
      }, frameMs);

      return () => window.clearInterval(timer);
    }

    const { sequence } = playback;
    if (!sequence.frames.length) return;

    let index = 0;
    setMask(sequence.frames[0].mask);

    const timer = window.setInterval(() => {
      index = (index + 1) % sequence.frames.length;
      if (!sequence.loop && index === 0) {
        window.clearInterval(timer);
        return;
      }
      setMask(sequence.frames[index].mask);
    }, playback.frameMs);

    return () => window.clearInterval(timer);
  }, [key, playback]);

  return mask;
}
