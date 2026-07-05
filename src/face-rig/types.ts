/**
 * The face rig contract — deliberately shaped like a future os.face@1
 * capability so a rig can later be promoted to an installable provider app
 * (same move as os.calendar@1). Renderers implement FaceRigEngine; nothing
 * else in the shell knows how a face is drawn, which is what makes engines
 * swappable (CSS today; kamiji rig, Live2D, or an app-hosted face later).
 */

/** Conversation-level moods, distinct from moment-to-moment mouth motion. */
export type FaceExpression = "neutral" | "attentive" | "thinking" | "happy";

/** Mirrors VoiceState but voice-agnostic — a rig never imports voice types. */
export type FaceSpeakingState = "idle" | "listening" | "userSpeaking" | "thinking" | "speaking";

/**
 * Mouth shapes for lip sync. Unused by the v1 amplitude-driven driver, but
 * part of the contract so a viseme-capable driver needs no engine changes.
 */
export type Viseme = "sil" | "aa" | "ee" | "ih" | "oh" | "ou" | "fv" | "mbp";

export interface FaceRigEngine {
  mount(container: HTMLElement): void;
  unmount(): void;
  setSpeakingState(state: FaceSpeakingState): void;
  setExpression(expression: FaceExpression): void;
  /** Output loudness 0..1 — drives mouth openness while speaking. */
  setAudioLevel(level: number): void;
  setViseme(viseme: Viseme, weight: number): void;
}
