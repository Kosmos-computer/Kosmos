/**
 * Agent cursor state — position, press state, and the movement animator for
 * the AI's virtual mouse. The store is the single writer of cursor position;
 * the uiDriver awaits `moveTo` so tool pacing matches the visible animation
 * (the agent literally cannot click faster than the cursor travels).
 */
import { create } from "zustand";

interface CursorStore {
  visible: boolean;
  x: number;
  y: number;
  /** True during the press half of a click — drives the "push down" visual. */
  pressed: boolean;
  /** Monotonic click counter — keys the ripple element so each click replays it. */
  clickCount: number;

  show: () => void;
  hide: () => void;
  setPressed: (pressed: boolean) => void;
  ripple: () => void;
  /** Animated travel to a viewport point; resolves when the cursor lands. */
  moveTo: (x: number, y: number) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Movement profile
//
// Human mouse travel is neither linear nor straight: it eases in and out, and
// bows slightly off the direct line. We approximate with a quadratic bezier
// (control point offset perpendicular to travel) sampled with an ease-in-out
// curve, then a short overshoot-and-settle so arrivals feel hand-driven
// rather than tweened.
// ---------------------------------------------------------------------------

const MIN_DURATION_MS = 220;
const MAX_DURATION_MS = 850;
/** ms of travel per px — tuned so a cross-screen move takes ~0.8s. */
const SPEED = 0.55;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Deterministic-enough alternating bow direction; no RNG state to manage. */
let bowSign = 1;

const AUTO_HIDE_MS = 4_000;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

/** Cancels the previous move if a new one starts mid-flight. */
let activeMove = 0;

export const useCursorStore = create<CursorStore>((set, get) => ({
  visible: false,
  // Park off the top-left until the first command reveals it mid-screen.
  x: typeof window !== "undefined" ? window.innerWidth / 2 : 400,
  y: typeof window !== "undefined" ? window.innerHeight / 2 : 300,
  pressed: false,
  clickCount: 0,

  show: () => {
    set({ visible: true });
    // The cursor lingers briefly after the last command, then fades — it's a
    // presence indicator, not permanent chrome.
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => set({ visible: false }), AUTO_HIDE_MS);
  },

  hide: () => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ visible: false });
  },

  setPressed: (pressed) => set({ pressed }),

  ripple: () => set((s) => ({ clickCount: s.clickCount + 1 })),

  moveTo: (tx, ty) => {
    const moveId = ++activeMove;
    get().show();
    const { x: sx, y: sy } = get();
    const dx = tx - sx;
    const dy = ty - sy;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return Promise.resolve();

    const duration = Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, dist * SPEED));

    // Control point: midpoint pushed perpendicular to travel, capped so short
    // hops stay near-straight and long ones bow visibly.
    bowSign = -bowSign;
    const bow = Math.min(dist * 0.12, 48) * bowSign;
    const cx = sx + dx / 2 + (-dy / dist) * bow;
    const cy = sy + dy / 2 + (dx / dist) * bow;

    // Overshoot point: a few px past the target along the travel direction.
    const overshoot = Math.min(6, dist * 0.04);
    const ox = tx + (dx / dist) * overshoot;
    const oy = ty + (dy / dist) * overshoot;

    return new Promise<void>((resolve) => {
      const start = performance.now();
      const settleMs = 90;

      const frame = (now: number) => {
        if (moveId !== activeMove) return resolve(); // superseded by a newer move
        const elapsed = now - start;

        if (elapsed < duration) {
          // Main travel: bezier from start → overshoot point via the bow.
          const t = easeInOutCubic(elapsed / duration);
          const u = 1 - t;
          set({
            x: u * u * sx + 2 * u * t * cx + t * t * ox,
            y: u * u * sy + 2 * u * t * cy + t * t * oy,
          });
          requestAnimationFrame(frame);
        } else if (elapsed < duration + settleMs) {
          // Settle: quick linear ease from the overshoot back onto the target.
          const t = (elapsed - duration) / settleMs;
          set({ x: ox + (tx - ox) * t, y: oy + (ty - oy) * t });
          requestAnimationFrame(frame);
        } else {
          set({ x: tx, y: ty });
          get().show(); // restart the auto-hide countdown from arrival
          resolve();
        }
      };
      requestAnimationFrame(frame);
    });
  },
}));
