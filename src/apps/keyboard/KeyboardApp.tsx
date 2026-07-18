/**
 * Keyboard — simple playable piano for the Arco shell.
 * Click / touch keys, or use the computer keyboard shortcuts shown on each key.
 * Computer-keyboard playback only runs while this app's window is focused.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useWindowStore, windowKey } from "../../os/windowStore";
import { BLACK_NOTES, NOTE_BY_KEY, WHITE_NOTES } from "./notes";
import { noteOff, noteOn, releaseAll, resumeAudio } from "./pianoAudio";

const KEYBOARD_WINDOW_ID = windowKey({ type: "system", app: "keyboard" });

function isKeyboardFocused(): boolean {
  return useWindowStore.getState().focusedId() === KEYBOARD_WINDOW_ID;
}

export function KeyboardApp() {
  const [activeIds, setActiveIds] = useState<Set<string>>(() => new Set());
  const activeRef = useRef(activeIds);
  activeRef.current = activeIds;

  const press = useCallback((id: string, frequency: number) => {
    if (activeRef.current.has(id)) return;
    void resumeAudio();
    noteOn(id, frequency);
    setActiveIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const release = useCallback((id: string) => {
    if (!activeRef.current.has(id)) return;
    noteOff(id);
    setActiveIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const down = new Set<string>();

    const silence = () => {
      if (down.size === 0 && activeRef.current.size === 0) return;
      down.clear();
      releaseAll();
      setActiveIds(new Set());
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isKeyboardFocused()) return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const note = NOTE_BY_KEY.get(event.key.toLowerCase());
      if (!note) return;
      event.preventDefault();
      if (down.has(note.id)) return;
      down.add(note.id);
      press(note.id, note.frequency);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const note = NOTE_BY_KEY.get(event.key.toLowerCase());
      if (!note || !down.has(note.id)) return;
      event.preventDefault();
      down.delete(note.id);
      release(note.id);
    };

    const onBlur = () => silence();

    // Another OS window took focus — stop holding notes and ignore keys.
    const unsubFocus = useWindowStore.subscribe(() => {
      if (!isKeyboardFocused()) silence();
    });

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      unsubFocus();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      releaseAll();
    };
  }, [press, release]);

  const whiteCount = WHITE_NOTES.length;

  return (
    <div className="arco-piano">
      <div className="arco-piano__stage" role="application" aria-label="Piano keyboard">
        <div className="arco-piano__board" style={{ ["--piano-white-count" as string]: whiteCount }}>
          <div className="arco-piano__whites">
            {WHITE_NOTES.map((note) => {
              const isActive = activeIds.has(note.id);
              return (
                <button
                  key={note.id}
                  type="button"
                  className={`arco-piano__key arco-piano__key--white${isActive ? " arco-piano__key--active" : ""}`}
                  aria-label={note.id}
                  aria-pressed={isActive}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    press(note.id, note.frequency);
                  }}
                  onPointerUp={() => release(note.id)}
                  onPointerCancel={() => release(note.id)}
                  onLostPointerCapture={() => release(note.id)}
                >
                  <span className="arco-piano__key-label">{note.label}</span>
                  <span className="arco-piano__key-shortcut">{note.key}</span>
                </button>
              );
            })}
          </div>

          <div className="arco-piano__blacks">
            {BLACK_NOTES.map((note) => {
              const isActive = activeIds.has(note.id);
              const left = ((note.whiteIndex + 1) / whiteCount) * 100;
              return (
                <button
                  key={note.id}
                  type="button"
                  className={`arco-piano__key arco-piano__key--black${isActive ? " arco-piano__key--active" : ""}`}
                  style={{ left: `${left}%` }}
                  aria-label={note.id}
                  aria-pressed={isActive}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    e.stopPropagation();
                    press(note.id, note.frequency);
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    release(note.id);
                  }}
                  onPointerCancel={() => release(note.id)}
                  onLostPointerCapture={() => release(note.id)}
                >
                  <span className="arco-piano__key-label">{note.label}</span>
                  <span className="arco-piano__key-shortcut">{note.key}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
