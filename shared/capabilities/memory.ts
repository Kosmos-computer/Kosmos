/**
 * os.memory@1 — typed memory stores, recall/extract intents, and agent ACLs.
 *
 * Contract ids use the brand-free "os." namespace. Vector backends and
 * embedders are swappable providers; this file defines the portable shape
 * the memory store and UI agree on.
 */

export const MEMORY_CONTRACT_ID = "os.memory@1";

/** Long-term and working memory taxonomy (Psyche-aligned). */
export type MemoryKind =
  | "working"
  | "episodic"
  | "semantic"
  | "procedural"
  | "identity"
  | "reference";

export type MemoryStatus = "active" | "archived" | "pending" | "conflicted";

export type MemoryAccess = "none" | "read" | "write" | "admin";

export type MemoryPrincipalKind =
  | "builtin"
  | "acp"
  | "automation"
  | "channel"
  | "app"
  | "user"
  | "system";

/** Stable caller id for ACL checks — e.g. agent:builtin, agent:acp:claude-code. */
export type MemoryPrincipalId = string;

export interface MemoryScopeKind {
  level: "kind";
  kind: MemoryKind;
}

export interface MemoryScopeCollection {
  level: "collection";
  collectionId: string;
}

export interface MemoryScopeAll {
  level: "all";
}

export type MemoryScope = MemoryScopeKind | MemoryScopeCollection | MemoryScopeAll;

export function memoryScopeKey(scope: MemoryScope): string {
  switch (scope.level) {
    case "all":
      return "all";
    case "kind":
      return `kind:${scope.kind}`;
    case "collection":
      return `collection:${scope.collectionId}`;
  }
}

export interface MemoryCollection {
  id: string;
  kind: MemoryKind;
  name: string;
  description?: string;
  embedderId: string;
  backendId: string;
  vectorCount: number;
  entryCount: number;
  dimensions: number;
  health: "healthy" | "degraded" | "syncing";
  lastIndexed: string;
  retentionDays: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEntry {
  id: string;
  kind: MemoryKind;
  collectionId: string;
  title: string;
  summary: string;
  body?: string;
  status: MemoryStatus;
  source: string;
  confidence: number;
  tags: string[];
  sourceSessionId?: string | null;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type EdgeRelation =
  | "supports"
  | "contradicts"
  | "derived_from"
  | "mentions"
  | "related"
  | "uses"
  | "stores"
  | "feeds"
  | "queries"
  | "indexes";

export interface MemoryEdge {
  id: string;
  fromId: string;
  toId: string;
  relation: EdgeRelation;
  weight: number;
}

export interface MemoryGrant {
  principalId: MemoryPrincipalId;
  scope: MemoryScope;
  access: MemoryAccess;
}

export interface MemoryBackendInfo {
  id: string;
  label: string;
  kind: "embedded" | "http";
  status: "available" | "unconfigured" | "error";
  description: string;
}

export interface MemoryEmbedderInfo {
  id: string;
  label: string;
  dimensions: number;
  status: "available" | "loading" | "error";
}

export interface RecallBudget {
  maxTokens: number;
  maxItems: number;
}

export interface RecallHit {
  entryId: string;
  kind: MemoryKind;
  title: string;
  excerpt: string;
  score: number;
  citation?: string;
}

export interface RecallBundle {
  hits: RecallHit[];
  tokenEstimate: number;
}

/** Intent ids and access class — grant/audit units of the contract. */
export const MEMORY_INTENTS = {
  "memory.entries.list": "read",
  "memory.entry.get": "read",
  "memory.search": "read",
  "memory.entry.create": "write",
  "memory.entry.update": "write",
  "memory.entry.archive": "write",
  "memory.edge.link": "write",
  "memory.collection.list": "read",
  "memory.collection.manage": "write",
  "memory.collection.ingest": "write",
  "memory.grants.list": "read",
  "memory.grants.set": "write",
} as const;

export type MemoryIntentId = keyof typeof MEMORY_INTENTS;

export const MEMORY_INTENT_SCHEMAS: Record<MemoryIntentId, Record<string, unknown>> = {
  "memory.entries.list": {
    type: "object",
    properties: {
      kind: { type: "string", enum: ["working", "episodic", "semantic", "procedural", "identity", "reference"] },
      collectionId: { type: "string" },
      status: { type: "string", enum: ["active", "archived", "pending", "conflicted"] },
      q: { type: "string" },
      limit: { type: "integer", minimum: 1, maximum: 100 },
    },
  },
  "memory.entry.get": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  "memory.search": {
    type: "object",
    properties: {
      query: { type: "string" },
      kinds: { type: "array", items: { type: "string" } },
      collectionIds: { type: "array", items: { type: "string" } },
      limit: { type: "integer", minimum: 1, maximum: 20 },
    },
    required: ["query"],
  },
  "memory.entry.create": {
    type: "object",
    properties: {
      kind: { type: "string" },
      collectionId: { type: "string" },
      title: { type: "string" },
      summary: { type: "string" },
      body: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
    },
    required: ["kind", "title", "summary"],
  },
  "memory.entry.update": {
    type: "object",
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      summary: { type: "string" },
      body: { type: "string" },
      status: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
    },
    required: ["id"],
  },
  "memory.entry.archive": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  "memory.edge.link": {
    type: "object",
    properties: {
      fromId: { type: "string" },
      toId: { type: "string" },
      relation: { type: "string" },
      weight: { type: "number" },
    },
    required: ["fromId", "toId", "relation"],
  },
  "memory.collection.list": { type: "object", properties: {} },
  "memory.collection.manage": {
    type: "object",
    properties: {
      id: { type: "string" },
      name: { type: "string" },
      embedderId: { type: "string" },
      backendId: { type: "string" },
    },
  },
  "memory.collection.ingest": {
    type: "object",
    properties: {
      collectionId: { type: "string" },
      path: { type: "string" },
      url: { type: "string" },
    },
    required: ["collectionId"],
  },
  "memory.grants.list": { type: "object", properties: {} },
  "memory.grants.set": {
    type: "object",
    properties: {
      principalId: { type: "string" },
      scope: { type: "object" },
      access: { type: "string", enum: ["none", "read", "write", "admin"] },
    },
    required: ["principalId", "scope", "access"],
  },
};
