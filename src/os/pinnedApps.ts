/**
 * Pure helpers for a surface's pinned-app order (NavRail's navPinnedIds,
 * Dock's dockPinnedIds) — split into shown/hidden, add, remove, reorder,
 * and normalize against the live app set. Ported from the longformer
 * prototype's workspace-config.ts (pinnedWorkspaceIds / trayPinnedIds),
 * collapsed into one generic set since Arco has a single entry type.
 */
import type { ShellAppEntry } from "./shellApps";

export function splitByPinned(
  pinnedIds: string[],
  entries: ShellAppEntry[],
): { pinned: ShellAppEntry[]; overflow: ShellAppEntry[] } {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const pinnedSet = new Set(pinnedIds);

  const pinned = pinnedIds
    .map((id) => byId.get(id))
    .filter((entry): entry is ShellAppEntry => Boolean(entry));
  const overflow = entries.filter((entry) => !pinnedSet.has(entry.id));

  return { pinned, overflow };
}

export function addPinned(pinnedIds: string[], id: string, index?: number): string[] {
  if (pinnedIds.includes(id)) return pinnedIds;
  const next = [...pinnedIds];
  const insertAt = index === undefined ? next.length : Math.max(0, Math.min(index, next.length));
  next.splice(insertAt, 0, id);
  return next;
}

export function removePinned(pinnedIds: string[], id: string): string[] {
  if (!pinnedIds.includes(id)) return pinnedIds;
  return pinnedIds.filter((pinnedId) => pinnedId !== id);
}

export function reorderPinned(pinnedIds: string[], fromIndex: number, toIndex: number): string[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= pinnedIds.length ||
    toIndex >= pinnedIds.length
  ) {
    return pinnedIds;
  }

  const next = [...pinnedIds];
  const [moved] = next.splice(fromIndex, 1);
  const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex;
  next.splice(insertAt, 0, moved);
  return next;
}

/** Keep stored order while dropping unknown ids and appending newly seen ones. */
export function normalizePinned(stored: string[], allIds: string[]): string[] {
  const known = new Set(allIds);
  const normalized = stored.filter((id) => known.has(id));
  for (const id of allIds) {
    if (!normalized.includes(id)) normalized.push(id);
  }
  if (normalized.length === stored.length && normalized.every((id, i) => id === stored[i])) {
    return stored;
  }
  return normalized;
}
