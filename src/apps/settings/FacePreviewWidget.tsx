import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
/**
 * Settings preview for assistant faces — manual speaking states and
 * expressions without a live voice session.
 */
import { useEffect, useRef, useState } from "react";
import { SettingsChipRow } from "../../components/patterns";
import { Chip } from "../../components/ui";
import { createFaceRigEngine } from "../../face-rig/createFaceRigEngine";
import { useFacePreferencesStore } from "../../face-rig/facePreferencesStore";
import type { FaceExpression, FaceRigEngine, FaceSpeakingState } from "../../face-rig/types";

const SPEAKING_OPTIONS: { id: FaceSpeakingState; label: string }[] = [
  { id: "idle", label: "Idle" },
  { id: "listening", label: "Listening" },
  { id: "userSpeaking", label: "User speaking" },
  { id: "thinking", label: "Thinking" },
  { id: "speaking", label: "Bot speaking" },
];

const EXPRESSION_OPTIONS: { id: FaceExpression; label: string }[] = [
  { id: "neutral", label: "Neutral" },
  { id: "attentive", label: "Attentive" },
  { id: "thinking", label: "Thinking" },
  { id: "happy", label: "Happy" },
];

function simulateSpeechLevel(elapsedSeconds: number): number {
  const wave =
    0.35 +
    0.45 * Math.sin(elapsedSeconds * 12) +
    0.2 * Math.sin(elapsedSeconds * 7.3);
  return Math.min(1, Math.max(0, wave));
}

export function FacePreviewWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FaceRigEngine | null>(null);
  const faceRigId = useFacePreferencesStore((s) => s.faceRigId);
  const [speakingState, setSpeakingState] = useState<FaceSpeakingState>("idle");
  const [expression, setExpression] = useState<FaceExpression>("neutral");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const engine = createFaceRigEngine(faceRigId);
    engineRef.current = engine;
    engine.mount(container);
    engine.setSpeakingState(speakingState);
    engine.setExpression(expression);
    return () => {
      engine.unmount();
      engineRef.current = null;
    };
  }, [faceRigId]);

  useEffect(() => {
    engineRef.current?.setSpeakingState(speakingState);
    engineRef.current?.setExpression(expression);
  }, [speakingState, expression]);

  useEffect(() => {
    if (speakingState !== "speaking") {
      engineRef.current?.setAudioLevel(0);
      return;
    }

    const startedAt = performance.now();
    let rafId = 0;
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      const elapsed = (performance.now() - startedAt) / 1000;
      engineRef.current?.setAudioLevel(simulateSpeechLevel(elapsed));
    };
    loop();
    return () => cancelAnimationFrame(rafId);
  }, [speakingState]);

  return (
    <div className="arco-settings-face-preview">
      <div
        ref={containerRef}
        className="arco-face-widget arco-settings-face-preview__face"
        data-face-rig={faceRigId}
      />
      <div className="arco-settings-face-preview__controls">
        <div className="arco-settings-face-preview__group">
          <span className="arco-settings-face-preview__label"><T k={I18nKey.APPS$SETTINGS_SPEAKING} /></span>
          <SettingsChipRow>
            {SPEAKING_OPTIONS.map((option) => (
              <Chip
                key={option.id}
                active={speakingState === option.id}
                onClick={() => setSpeakingState(option.id)}
              >
                {option.label}
              </Chip>
            ))}
          </SettingsChipRow>
        </div>
        <div className="arco-settings-face-preview__group">
          <span className="arco-settings-face-preview__label"><T k={I18nKey.APPS$SETTINGS_EXPRESSION} /></span>
          <SettingsChipRow>
            {EXPRESSION_OPTIONS.map((option) => (
              <Chip
                key={option.id}
                active={expression === option.id}
                onClick={() => setExpression(option.id)}
              >
                {option.label}
              </Chip>
            ))}
          </SettingsChipRow>
        </div>
      </div>
    </div>
  );
}
