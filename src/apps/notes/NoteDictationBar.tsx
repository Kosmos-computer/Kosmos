import { Loader2, Mic } from "lucide-react";
import type { DictationStatus } from "../../voice/dictation";

export function NoteDictationBar({
  status,
  interim,
  engine,
}: {
  status: DictationStatus;
  interim: string;
  engine: "webspeech" | "server" | null;
}) {
  if (status === "idle" && !interim) return null;

  const label =
    status === "processing"
      ? "Transcribing…"
      : status === "listening"
        ? engine === "server"
          ? "Recording — click the mic again to transcribe"
          : "Listening…"
        : "Dictation";

  return (
    <div className="arco-notes-dictation" role="status" aria-live="polite">
      <Mic size={14} strokeWidth={1.75} aria-hidden="true" />
      <span className="arco-notes-dictation__label">{label}</span>
      {status === "processing" ? (
        <Loader2 size={14} className="arco-spin" aria-hidden="true" />
      ) : interim ? (
        <span className="arco-notes-dictation__interim">{interim}</span>
      ) : null}
    </div>
  );
}
