/**
 * Memory ACL grants — which principals may read/write/admin which scopes.
 *
 * Parallel to app grantStore, but keyed by memory principal + scope (kind /
 * collection / all). Default seeds encode the OpenClaw lesson: channel and
 * automation agents get read-only working+episodic only — no identity or
 * semantic personal memory in group/untrusted contexts.
 */
import type {
  MemoryAccess,
  MemoryGrant,
  MemoryKind,
  MemoryPrincipalId,
  MemoryScope,
} from "../../shared/capabilities/memory.js";
import { memoryScopeKey } from "../../shared/capabilities/memory.js";

const ACCESS_RANK: Record<MemoryAccess, number> = {
  none: 0,
  read: 1,
  write: 2,
  admin: 3,
};

const MEMORY_KINDS: MemoryKind[] = [
  "working",
  "episodic",
  "semantic",
  "procedural",
  "identity",
  "reference",
];

export function parseScopeKey(key: string): MemoryScope | null {
  if (key === "all") return { level: "all" };
  if (key.startsWith("kind:")) {
    const kind = key.slice(5) as MemoryKind;
    if (!MEMORY_KINDS.includes(kind)) return null;
    return { level: "kind", kind };
  }
  if (key.startsWith("collection:")) {
    return { level: "collection", collectionId: key.slice("collection:".length) };
  }
  return null;
}

export function accessAtLeast(have: MemoryAccess, need: MemoryAccess): boolean {
  return ACCESS_RANK[have] >= ACCESS_RANK[need];
}

/** Resolve seeded base principal for channel/automation ids with suffixes. */
export function resolvePrincipalAliases(principalId: MemoryPrincipalId): MemoryPrincipalId[] {
  const ids = [principalId];
  if (principalId.startsWith("agent:channel:") && principalId !== "agent:channel") {
    ids.push("agent:channel");
  }
  if (principalId.startsWith("agent:automation:") && principalId !== "agent:automation") {
    ids.push("agent:automation");
  }
  if (principalId.startsWith("user:") && principalId !== "user") {
    ids.push("user");
  }
  return ids;
}

export type GrantRow = {
  principalId: string;
  scopeKey: string;
  access: MemoryAccess;
};

/** Effective access for a kind (+ optional collection), max of matching grants. */
export function effectiveAccess(
  grants: GrantRow[],
  principalId: MemoryPrincipalId,
  kind: MemoryKind,
  collectionId?: string,
): MemoryAccess {
  const principals = new Set(resolvePrincipalAliases(principalId));
  let best: MemoryAccess = "none";

  for (const g of grants) {
    if (!principals.has(g.principalId)) continue;
    let matches = false;
    if (g.scopeKey === "all") matches = true;
    else if (g.scopeKey === `kind:${kind}`) matches = true;
    else if (collectionId && g.scopeKey === `collection:${collectionId}`) matches = true;
    if (matches && ACCESS_RANK[g.access] > ACCESS_RANK[best]) {
      best = g.access;
    }
  }
  return best;
}

export function checkKindAccess(
  grants: GrantRow[],
  principalId: MemoryPrincipalId,
  kind: MemoryKind,
  need: MemoryAccess,
  collectionId?: string,
): { allowed: boolean; access: MemoryAccess } {
  const access = effectiveAccess(grants, principalId, kind, collectionId);
  return { allowed: accessAtLeast(access, need), access };
}

/** Whether principal can list/search across any kind at the given access. */
export function canAccessAnyKind(
  grants: GrantRow[],
  principalId: MemoryPrincipalId,
  need: MemoryAccess,
): boolean {
  return MEMORY_KINDS.some(
    (kind) => checkKindAccess(grants, principalId, kind, need).allowed,
  );
}

export function kindsReadable(
  grants: GrantRow[],
  principalId: MemoryPrincipalId,
): Set<MemoryKind> {
  return new Set(
    MEMORY_KINDS.filter((kind) => checkKindAccess(grants, principalId, kind, "read").allowed),
  );
}

export function grantToRow(grant: MemoryGrant): GrantRow {
  return {
    principalId: grant.principalId,
    scopeKey: memoryScopeKey(grant.scope),
    access: grant.access,
  };
}

export function rowToGrant(row: GrantRow): MemoryGrant | null {
  const scope = parseScopeKey(row.scopeKey);
  if (!scope) return null;
  return { principalId: row.principalId, scope, access: row.access };
}

/** Default ACL matrix seeded once on first DB open. */
export function defaultSeedGrants(): GrantRow[] {
  return [
    { principalId: "agent:builtin", scopeKey: "all", access: "admin" },
    { principalId: "user", scopeKey: "all", access: "admin" },
    // OpenClaw "no personal MEMORY in groups": channel/automation may only
    // touch working + episodic (read), never identity/semantic write.
    { principalId: "agent:channel", scopeKey: "kind:working", access: "read" },
    { principalId: "agent:channel", scopeKey: "kind:episodic", access: "read" },
    { principalId: "agent:automation", scopeKey: "kind:working", access: "read" },
    { principalId: "agent:automation", scopeKey: "kind:episodic", access: "read" },
  ];
}

export { MEMORY_KINDS };
