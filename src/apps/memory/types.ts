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
  Database,
  FileText,
  GitBranch,
  LayoutDashboard,
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
  | "soul-md"
  | "ethics-md"
  | "user-md"
  | "settings";

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
  sections: { id: string; heading: string; content: string }[];
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
  ethicsDocument: IdentityDocument;
  userDocument: IdentityDocument;
  systemNote: string;
}

export const MEMORY_VIEW_ICONS: Record<MemoryViewId, LucideIcon> = {
  dashboard: LayoutDashboard,
  memory: Bookmark,
  "knowledge-graph": GitBranch,
  rag: Sparkles,
  "vector-db": Database,
  "soul-md": Brain,
  "ethics-md": ScrollText,
  "user-md": FileText,
  settings: Settings,
};
