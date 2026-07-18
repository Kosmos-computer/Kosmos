/**
 * Shared safety / audience / certification vocabulary for models and agents.
 * Enforcement is stubbed via canUseProfile — full certification suites and
 * parental allowlists remain later work on model-agent-profiles-plan.md.
 */
export type TrustLevel = "untrusted" | "community" | "verified" | "builtin";

export type AudienceAge = "all" | "13+" | "16+" | "18+";

export type SafetyLevel = "restricted" | "standard" | "elevated";

export type CertificationStatus = "unevaluated" | "pass" | "partial" | "fail";

export interface SafetyProfile {
  level: SafetyLevel;
  /** Short operator-facing note (e.g. "confirm-heavy until certified"). */
  notes?: string;
}

export interface AudienceProfile {
  age: AudienceAge;
}

export interface CertificationProfile {
  status: CertificationStatus;
  /** Suite id when a result exists (e.g. arco.smoke-v1). */
  suiteId?: string;
  updatedAt?: string;
}

/** Optional attachable trust metadata for ModelManifest / AgentProfile. */
export interface ProfileTrustMeta {
  trust?: TrustLevel;
  safety?: SafetyProfile;
  audience?: AudienceProfile;
  certification?: CertificationProfile;
}

export interface CanUseProfileInput {
  enabled?: boolean;
  safety?: SafetyProfile;
  audience?: AudienceProfile;
  certification?: CertificationProfile;
  /** When true, parental mode is on and restricted profiles are blocked. */
  parentalControls?: boolean;
  role?: "owner" | "admin" | "member" | "viewer";
}

export interface CanUseProfileResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Gate for slot resolution and agent spawn.
 * Stub: disabled → deny; parental + restricted → deny for non-owner/admin;
 * everything else passes (certification not enforced yet).
 */
export function canUseProfile(input: CanUseProfileInput): CanUseProfileResult {
  if (input.enabled === false) {
    return { allowed: false, reason: "Profile is disabled" };
  }
  if (
    input.parentalControls &&
    input.safety?.level === "restricted" &&
    input.role !== "owner" &&
    input.role !== "admin"
  ) {
    return { allowed: false, reason: "Restricted by parental controls" };
  }
  return { allowed: true };
}

export function defaultSafety(level: SafetyLevel = "standard"): SafetyProfile {
  return { level };
}

export function defaultCertification(
  status: CertificationStatus = "unevaluated",
): CertificationProfile {
  return { status };
}
