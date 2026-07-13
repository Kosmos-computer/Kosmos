import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
/**
 * Live voice-session UI: compact dock above the composer, or an expanded
 * panel pinned above the scrollable thread (chat does not scroll behind it).
 */
import { useEffect } from "react";
import { Maximize2, Minimize2, Minus, X } from "lucide-react";
import type { VoiceState } from "@shared/capabilities/voice";
import { FaceWidget } from "../../face-rig";
import type { VoiceHook } from "../../voice";
import { useVoiceBarStore, type VoiceBarDisplay } from "./voiceBarStore";

const STATE_LABELS: Record<VoiceState, string> = {
  idle: "",
  connecting: "Connecting…",
  listening: "Listening",
  userSpeaking: "Hearing you…",
  thinking: "Thinking…",
  botSpeaking: "Speaking",
  error: "Voice error",
};

type VoiceBarPlacement = "expanded" | "dock";

export function VoiceBar({
  voice,
  placement,
}: {
  voice: VoiceHook;
  placement: VoiceBarPlacement;
}) {
  const display = useVoiceBarStore((s) => s.display);
  const setDisplay = useVoiceBarStore((s) => s.setDisplay);
  const reset = useVoiceBarStore((s) => s.reset);

  useEffect(() => {
    if (!voice.active) reset();
  }, [voice.active, reset]);

  // Expanded sits above the scrollable thread; dock sits above the composer.
  if (placement === "expanded" && display !== "expanded") return null;
  if (placement === "dock" && display === "expanded") return null;

  const transcript =
    voice.state === "userSpeaking" || voice.state === "thinking"
      ? voice.userTranscript
      : (voice.botTranscript ?? voice.userTranscript);

  const onMinimize = () => setDisplay(display === "minimized" ? "default" : "minimized");
  const onExpand = () => setDisplay(display === "expanded" ? "default" : "expanded");
  const onClose = () => void voice.toggle().catch(() => {});

  return (
    <VoiceBarContent
      display={display}
      stateLabel={STATE_LABELS[voice.state]}
      transcript={transcript?.text}
      onMinimize={onMinimize}
      onExpand={onExpand}
      onClose={onClose}
    />
  );
}

function VoiceBarContent({
  display,
  stateLabel,
  transcript,
  onMinimize,
  onExpand,
  onClose,
}: {
  display: VoiceBarDisplay;
  stateLabel: string;
  transcript?: string;
  onMinimize: () => void;
  onExpand: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className={[
        "arco-voicebar",
        display === "expanded" && "arco-voicebar--expanded",
        display === "minimized" && "arco-voicebar--minimized",
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="arco-voicebar__controls">
        <button
          type="button"
          className="arco-voicebar__control"
          aria-label={display === "minimized" ? "Restore voice bar" : "Minimize voice bar"}
          onClick={onMinimize}
        >
          <Minus size={12} />
        </button>
        <button
          type="button"
          className="arco-voicebar__control"
          aria-label={display === "expanded" ? "Collapse voice bar" : "Expand voice bar"}
          onClick={onExpand}
        >
          {display === "expanded" ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
        <button
          type="button"
          className="arco-voicebar__control arco-voicebar__control--close"
          aria-label={i18n.t(I18nKey.APPS$CHAT_END_VOICE_SESSION)}
          onClick={onClose}
        >
          <X size={12} />
        </button>
      </div>

      <FaceWidget
        className={
          display === "expanded"
            ? "arco-voicebar__face arco-voicebar__face--expanded"
            : display === "minimized"
              ? "arco-voicebar__face arco-voicebar__face--minimized"
              : "arco-voicebar__face"
        }
      />

      <div className="arco-voicebar__body">
        <div className="arco-voicebar__state">{stateLabel}</div>
        {transcript && display !== "minimized" && (
          <div className="arco-voicebar__transcript">{transcript}</div>
        )}
      </div>
    </div>
  );
}
