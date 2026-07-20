import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "../../components/ui/Button";
import type { DictationStatus } from "../../voice/dictation";

export function NoteDictationBar({
  status,
  interim,
  engine,
  onStop,
}: {
  status: DictationStatus;
  interim: string;
  engine: "webspeech" | "server" | null;
  onStop: () => void;
}) {
  if (status === "idle" && !interim) return null;

  const label =
    status === "processing"
      ? "Transcribing…"
      : status === "listening"
        ? engine === "server"
          ? "Recording…"
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
      <Button
        variant="default"
        className="arco-notes-dictation__stop"
        aria-label={i18n.t(I18nKey.APPS$NOTES_STOP)}
        disabled={status === "processing"}
        onClick={onStop}
      >
        <Square size={12} strokeWidth={1.75} aria-hidden="true" />
        <T k={I18nKey.APPS$NOTES_STOP} />
      </Button>
    </div>
  );
}
