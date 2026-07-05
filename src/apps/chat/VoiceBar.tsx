/**
 * Live voice-session strip above the chat composer: the face rig, the
 * session state, and the most recent exchange. Rendered only while a voice
 * conversation is active.
 */
import type { VoiceState } from "@shared/capabilities/voice";
import { FaceWidget } from "../../face-rig";
import type { VoiceHook } from "../../voice";

const STATE_LABELS: Record<VoiceState, string> = {
  idle: "",
  connecting: "Connecting…",
  listening: "Listening",
  userSpeaking: "Hearing you…",
  thinking: "Thinking…",
  botSpeaking: "Speaking",
  error: "Voice error",
};

export function VoiceBar({ voice }: { voice: VoiceHook }) {
  const transcript =
    voice.state === "userSpeaking" || voice.state === "thinking"
      ? voice.userTranscript
      : (voice.botTranscript ?? voice.userTranscript);

  return (
    <div className="arco-voicebar" role="status" aria-live="polite">
      <FaceWidget />
      <div className="arco-voicebar__body">
        <div className="arco-voicebar__state">{STATE_LABELS[voice.state]}</div>
        {transcript && <div className="arco-voicebar__transcript">{transcript.text}</div>}
      </div>
    </div>
  );
}
