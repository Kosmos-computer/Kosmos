/**
 * Persisted sidebar list preferences — organize mode, sort field, group order,
 * per-folder collapse state, and pinned conversations (agent-canvas
 * conversation panel + pinned-conversations-store semantics).
 */
import { create } from "zustand";
import type { ConversationSortField, OrganizeMode } from "./sidebarGrouping";

const STORAGE_KEY = "arco:studio-sidebar:v1";

interface SidebarPreferences {
  organizeMode: OrganizeMode;
  sortField: ConversationSortField;
  groupOrder: string[];
  collapsedGroups: string[];
  expandedPreviews: string[];
  /** Pinned session ids, most-recently-pinned first. */
  pinnedSessionIds: string[];
}

interface SidebarPreferencesStore extends SidebarPreferences {
  setOrganizeMode: (mode: OrganizeMode) => void;
  setSortField: (field: ConversationSortField) => void;
  setGroupOrder: (order: readonly string[]) => void;
  toggleGroupCollapsed: (groupId: string) => void;
  toggleGroupPreview: (groupId: string) => void;
  togglePinned: (sessionId: string) => void;
  /** Drop pinned ids whose session no longer exists (deleted conversations). */
  prunePinned: (existingIds: readonly string[]) => void;
}

function load(): SidebarPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT, ...(JSON.parse(raw) as Partial<SidebarPreferences>) };
  } catch {
    // Corrupt prefs — defaults.
  }
  return DEFAULT;
}

const DEFAULT: SidebarPreferences = {
  organizeMode: "grouped",
  sortField: "updated",
  groupOrder: [],
  collapsedGroups: [],
  expandedPreviews: [],
  pinnedSessionIds: [],
};

function persist(state: SidebarPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota errors are non-fatal.
  }
}

export const useSidebarPreferencesStore = create<SidebarPreferencesStore>((set, get) => ({
  ...load(),
  setOrganizeMode: (organizeMode) => {
    set({ organizeMode });
    persist({ ...get(), organizeMode });
  },
  setSortField: (sortField) => {
    set({ sortField });
    persist({ ...get(), sortField });
  },
  setGroupOrder: (groupOrder) => {
    const next = [...groupOrder];
    set({ groupOrder: next });
    persist({ ...get(), groupOrder: next });
  },
  toggleGroupCollapsed: (groupId) => {
    const collapsed = new Set(get().collapsedGroups);
    if (collapsed.has(groupId)) collapsed.delete(groupId);
    else collapsed.add(groupId);
    const collapsedGroups = [...collapsed];
    set({ collapsedGroups });
    persist({ ...get(), collapsedGroups });
  },
  toggleGroupPreview: (groupId) => {
    const expanded = new Set(get().expandedPreviews);
    if (expanded.has(groupId)) expanded.delete(groupId);
    else expanded.add(groupId);
    const expandedPreviews = [...expanded];
    set({ expandedPreviews });
    persist({ ...get(), expandedPreviews });
  },
  togglePinned: (sessionId) => {
    const current = get().pinnedSessionIds;
    const pinnedSessionIds = current.includes(sessionId)
      ? current.filter((id) => id !== sessionId)
      : [sessionId, ...current];
    set({ pinnedSessionIds });
    persist({ ...get(), pinnedSessionIds });
  },
  prunePinned: (existingIds) => {
    const existing = new Set(existingIds);
    const current = get().pinnedSessionIds;
    const pinnedSessionIds = current.filter((id) => existing.has(id));
    if (pinnedSessionIds.length === current.length) return;
    set({ pinnedSessionIds });
    persist({ ...get(), pinnedSessionIds });
  },
}));
