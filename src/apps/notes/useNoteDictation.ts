import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { dictationEngine, isDictationSupported, startDictation, type DictationStatus } from "../../voice/dictation";
import { useOsStore } from "../../os/osStore";

export function useNoteDictation(editor: Editor | null) {
  const [status, setStatus] = useState<DictationStatus>("idle");
  const [interim, setInterim] = useState("");
  const stopRef = useRef<(() => void) | null>(null);
  const notify = useOsStore((s) => s.notify);
  const available = isDictationSupported();
  const engine = dictationEngine();

  useEffect(() => () => stopRef.current?.(), []);

  const stop = useCallback(() => {
    const stopFn = stopRef.current;
    stopRef.current = null;
    if (stopFn) {
      // Engines report status via onStatus (server goes listening → processing → idle).
      stopFn();
      return;
    }
    setInterim("");
    setStatus("idle");
  }, []);

  const toggle = useCallback(async () => {
    if (!editor) return;

    if (status !== "idle") {
      stop();
      return;
    }

    if (!available) {
      notify("Dictation is not supported in this browser.");
      return;
    }

    stopRef.current = await startDictation({
      onStatus: setStatus,
      onInterim: setInterim,
      onFinal: (text) => {
        if (!text.trim()) return;
        const chain = editor.chain().focus();
        const { from, to } = editor.state.selection;
        if (from !== to) chain.deleteRange({ from, to });
        chain.insertContent(`${text.trim()} `).run();
      },
      onError: (message) => {
        notify(message);
        stop();
      },
    });
  }, [available, editor, notify, status, stop]);

  return {
    status,
    interim,
    available,
    engine,
    active: status !== "idle",
    toggle,
    stop,
  };
}
