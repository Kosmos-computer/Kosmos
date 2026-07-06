import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { speak } from "../../voice/textToSpeech";
import { useOsStore } from "../../os/osStore";
import { getEditorSpeakText } from "./noteEditorText";

type ReadAloudStatus = "idle" | "loading" | "playing";

export function useNoteReadAloud(editor: Editor | null) {
  const [status, setStatus] = useState<ReadAloudStatus>("idle");
  const stopRef = useRef<(() => void) | null>(null);
  const notify = useOsStore((s) => s.notify);

  useEffect(() => () => stopRef.current?.(), []);

  const toggle = useCallback(() => {
    if (!editor) return;

    if (status !== "idle") {
      stopRef.current?.();
      setStatus("idle");
      return;
    }

    const text = getEditorSpeakText(editor);
    if (!text) {
      notify("Nothing to read aloud — select text or add content to the note.");
      return;
    }

    setStatus("loading");
    stopRef.current = speak(text, {
      onStart: () => setStatus("playing"),
      onEnd: () => setStatus("idle"),
      onError: (err) => {
        setStatus("idle");
        console.error("Read aloud failed:", err);
        notify("Read aloud failed — is the voice server running? (npm run voice)");
      },
    });
  }, [editor, notify, status]);

  return { status, toggle };
}
