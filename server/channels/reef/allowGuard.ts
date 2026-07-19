/**
 * Passthrough guard for Kosmos when no LLM DLP classifier is configured.
 * Verdicts must satisfy OpenClaw admitVerdict (pinned model echo + policyVersion).
 */
import type { GuardAdapter, Verdict } from "./protocol/guard.js";

/** Documented immutable id admitted by OpenClaw assertPinnedModel. */
const PINNED = "gpt-5.6-sol";

export function createAllowAllGuard(policyVersion = "kosmos-allow"): GuardAdapter {
  return {
    providerId: "kosmos-allow",
    pinnedModel: PINNED,
    async classify(request): Promise<Verdict> {
      return {
        decision: "allow",
        category: "kosmos-allow",
        reason: "allow-all guard (set guardProvider for real DLP)",
        model: PINNED,
        policyVersion: request.policyVersion || policyVersion,
      };
    },
  };
}
