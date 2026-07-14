/**
 * Thread scroll follow — pins the chat to the latest message while the user
 * stays near the bottom, and surfaces a jump control once they scroll up.
 *
 * Both Chat and Studio share this so streaming auto-scroll and the
 * scroll-to-latest affordance stay in sync.
 */
import { useCallback, useEffect, useRef, useState } from "react";

/** Distance from the bottom (px) that still counts as "following" the stream. */
const NEAR_BOTTOM_PX = 40;

/**
 * Bind a scrollable thread pane to follow-latest behavior.
 *
 * Pass the same dependency array you would use to re-pin on new messages
 * (typically the items array). Call `pinToLatest` when the user sends so the
 * next turn snaps to the bottom even if they were scrolled up.
 */
export function useThreadScroll(itemsDependency: unknown) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);
  const [showJump, setShowJump] = useState(false);

  const syncFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    followRef.current = nearBottom;
    setShowJump(!nearBottom);
  }, []);

  // Auto-follow new/streaming content only while the user hasn't scrolled away.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && followRef.current) el.scrollTop = el.scrollHeight;
  }, [itemsDependency]);

  const scrollToLatest = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    followRef.current = true;
    setShowJump(false);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  /** Force follow on (e.g. after the user submits a new message). */
  const pinToLatest = useCallback(() => {
    followRef.current = true;
    setShowJump(false);
  }, []);

  return {
    scrollRef,
    onScroll: syncFromScroll,
    showJump,
    scrollToLatest,
    pinToLatest,
  };
}
