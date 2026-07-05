/**
 * AgentCursor — the visible body of the AI's virtual mouse: a Figma-style
 * labeled pointer rendered above all windows. Pure presentation: position and
 * press state stream in from cursorStore (written by the animator), so this
 * component never decides where the cursor goes.
 *
 * pointer-events: none throughout — the overlay must never intercept the
 * user's real mouse or the synthetic events the driver dispatches beneath it.
 */
import { MousePointer2 } from "lucide-react";
import { useCursorStore } from "./cursorStore";

export function AgentCursor() {
  const { visible, x, y, pressed, clickCount } = useCursorStore();

  return (
    <div
      className={`arco-agent-cursor ${visible ? "arco-agent-cursor--visible" : ""} ${
        pressed ? "arco-agent-cursor--pressed" : ""
      }`}
      style={{ transform: `translate(${x}px, ${y}px)` }}
      aria-hidden="true"
    >
      {/* Keyed on clickCount so every click remounts the ripple and replays its animation. */}
      {clickCount > 0 && <span key={clickCount} className="arco-agent-cursor__ripple" />}
      <MousePointer2 className="arco-agent-cursor__pointer" size={20} />
      <span className="arco-agent-cursor__tag">Arco</span>
    </div>
  );
}
