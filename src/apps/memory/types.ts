/**
 * Memory workspace UI types — mirrors shared/capabilities/memory.ts for the
 * operator surface. Wire points for Phase 1 API responses.
 */
import type {
  MemoryBackendInfo,
  MemoryCollection,
  MemoryEdge,
  MemoryEmbedderInfo,
  MemoryEntry,
  MemoryGrant,
  MemoryKind,
} from "@shared/capabilities/memory";
import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  Brain,
  Compass,
  Database,
  FileText,
  GitBranch,
  Globe,
  LayoutDashboard,
  Map,
  ScrollText,
  Settings,
  Sparkles,
} from "lucide-react";

export type { MemoryBackendInfo, MemoryCollection, MemoryEdge, MemoryEmbedderInfo, MemoryEntry, MemoryGrant, MemoryKind };

export type MemoryViewId =
  | "dashboard"
  | "memory"
  | "knowledge-graph"
  | "rag"
  | "vector-db"
  | "world-model"
  | "worldview-md"
  | "integral-map-md"
  | "soul-md"
  | "ethics-md"
  | "user-md"
  | "settings";

export type IntegralQuadrant = "I" | "We" | "It" | "Its";

export type WorldModelDomain =
  | "cosmology"
  | "consciousness"
  | "epistemology"
  | "development"
  | "ethics"
  | "practice";

export type WorldModelConfidence = "axiom" | "working" | "tentative";

export interface IdentitySection {
  id: string;
  heading: string;
  content: string;
  quadrant?: IntegralQuadrant;
  domain?: WorldModelDomain;
  confidence?: WorldModelConfidence;
  links?: string[];
}

export interface EthicalPrinciple {
  id: string;
  statement: string;
  priority: number;
  derivedFrom: string[];
  appliesIn?: IntegralQuadrant[];
}

export type WorldModelNodeKind = "worldview" | "map" | "principle";

export interface WorldModelNode {
  id: string;
  label: string;
  kind: WorldModelNodeKind;
}

export interface WorldModelEdge {
  id: string;
  fromId: string;
  toId: string;
  relation: "derived_from" | "supports" | "contradicts" | "applies_in";
  weight: number;
}

export interface MemoryNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  view: MemoryViewId;
  section: "overview" | "stores" | "identity";
}

export interface MemoryMetric {
  id: string;
  label: string;
  value: string;
  change?: string;
  tone?: "accent" | "success" | "warning" | "neutral";
}

export interface RagQueryTrace {
  id: string;
  query: string;
  timestamp: string;
  latencyMs: number;
  chunksRetrieved: number;
  answerPreview: string;
}

export interface RagChunkPreview {
  id: string;
  source: string;
  content: string;
  score: number;
  tokens: number;
}

export interface IdentityDocument {
  id: string;
  title: string;
  filename: string;
  version: string;
  lastEdited: string;
  sections: IdentitySection[];
}

export interface MemoryWorkspaceData {
  productName: string;
  modelName: string;
  tagline: string;
  navItems: MemoryNavItem[];
  overviewMetrics: MemoryMetric[];
  memoryEntries: MemoryEntry[];
  graphNodes: { id: string; label: string; type: string; connections: number }[];
  graphEdges: MemoryEdge[];
  ragQueries: RagQueryTrace[];
  ragChunks: RagChunkPreview[];
  collections: MemoryCollection[];
  backends: MemoryBackendInfo[];
  embedders: MemoryEmbedderInfo[];
  grants: MemoryGrant[];
  soulDocument: IdentityDocument;
  worldviewDocument: IdentityDocument;
  integralMapDocument: IdentityDocument;
  ethicsDocument: IdentityDocument;
  userDocument: IdentityDocument;
  ethicalPrinciples: EthicalPrinciple[];
  worldModelNodes: WorldModelNode[];
  worldModelEdges: WorldModelEdge[];
  systemNote: string;
}

export const MEMORY_VIEW_ICONS: Record<MemoryViewId, LucideIcon> = {
  dashboard: LayoutDashboard,
  memory: Bookmark,
  "knowledge-graph": GitBranch,
  rag: Sparkles,
  "vector-db": Database,
  "world-model": Compass,
  "worldview-md": Globe,
  "integral-map-md": Map,
  "soul-md": Brain,
  "ethics-md": ScrollText,
  "user-md": FileText,
  settings: Settings,
};
