/**
 * React binding for the shell's singleton voice session. Multiple components
 * can mount this hook; they all observe the same session.
 */
import { useCallback, useEffect, useState } from "react";
import type { VoiceState, VoiceTranscript } from "@shared/capabilities/voice";
import { voiceClient } from "./VoiceClient";

export interface VoiceHook {
  state: VoiceState;
  /** Whether the voice server responded to the last health probe. */
  available: boolean;
  /** Live user speech (partial until final). */
  userTranscript: VoiceTranscript | null;
  /** The bot's most recent utterance text. */
  botTranscript: VoiceTranscript | null;
  active: boolean;
  toggle: () => Promise<void>;
}

const HEALTH_POLL_MS = 15_000;

export function useVoice(): VoiceHook {
  const [state, setState] = useState<VoiceState>(voiceClient.getState());
  const [available, setAvailable] = useState(false);
  const [userTranscript, setUserTranscript] = useState<VoiceTranscript | null>(null);
  const [botTranscript, setBotTranscript] = useState<VoiceTranscript | null>(null);

  useEffect(() => {
    const unsubscribe = voiceClient.subscribe((event) => {
      switch (event.type) {
        case "state":
          setState(event.state);
          if (event.state === "idle") {
            setUserTranscript(null);
            setBotTranscript(null);
          }
          break;
        case "userTranscript":
          setUserTranscript(event.transcript);
          break;
        case "botTranscript":
          setBotTranscript(event.transcript);
          break;
        default:
          break;
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      const ok = await voiceClient.checkHealth();
      if (!cancelled) setAvailable(ok);
    };
    void probe();
    const timer = setInterval(() => void probe(), HEALTH_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const active = state !== "idle" && state !== "error";

  const toggle = useCallback(async () => {
    if (voiceClient.getState() === "idle" || voiceClient.getState() === "error") {
      await voiceClient.start();
    } else {
      await voiceClient.stop();
    }
  }, []);

  return { state, available, userTranscript, botTranscript, active, toggle };
}
