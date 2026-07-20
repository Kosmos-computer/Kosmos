/**
 * Pure rules for when a chat SSE `session` event may change the focused
 * conversation. Background streams must never steal selection — especially
 * under cloud latency where the event can arrive after the user already
 * switched or started a new chat (Hermes / agent-canvas session guards).
 */

/** True when the stream that just learned its session id still owns the UI. */
export function shouldActivateOnSessionEvent(opts: {
  /** Key the UI was showing when the turn started (draft or session id). */
  streamOwnerKey: string;
  /**
   * Key the UI is showing when the session event arrives — capture *before*
   * migrateBuffer, which may rewrite activeKey from draft → session id.
   */
  activeKey: string;
  /** Draft sentinel used by useChat / studioStore (kept for call-site clarity). */
  draftKey: string;
}): boolean {
  void opts.draftKey;
  return opts.activeKey === opts.streamOwnerKey;
}

/**
 * Whether an activity-mutating shell event (tool/file drawer) may fall back
 * to the focused session when no sessionKey was provided.
 */
export function mayFallbackActivityToActiveSession(
  sessionKey: string | null | undefined,
): boolean {
  return sessionKey != null && sessionKey !== "";
}
