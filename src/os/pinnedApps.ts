/**
 * Pure helpers for a surface's pinned-app order (NavRail's navPinnedIds,
 * Dock's dockPinnedIds) — split into shown/hidden, add, remove, reorder,
 * and normalize against the live app set. Ported from the longformer
 * prototype's workspace-config.ts (pinnedWorkspaceIds / trayPinnedIds),
 * collapsed into one generic set since Arco has a single entry type.
 */
import type { ShellAppEntry } from "./shellApps";

/** Max pinned apps shown as tray icons; the rest appear in "View all apps". */
export const DOCK_VISIBLE_APP_LIMIT = 10;

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

const DEFAULT_PINNED_IDS = [
  "system:chat",
  "system:studio",
  "system:apps",
  "system:skills",
  "system:files",
  "system:maps",
  "system:notes",
  "system:email",
  "system:tasks",
  "system:contacts",
  "system:terminal",
  "system:settings",
];

function insertInCanonicalOrder(pinned: string[], id: string, allIds: string[]): string[] {
  const idIdx = allIds.indexOf(id);
  let insertAt = pinned.length;
  for (let i = 0; i < pinned.length; i++) {
    if (allIds.indexOf(pinned[i]) > idIdx) {
      insertAt = i;
      break;
    }
  }
  const next = [...pinned];
  next.splice(insertAt, 0, id);
  return next;
}

function ensureAppAfter(pinned: string[], id: string, afterId: string): string[] {
  if (!pinned.includes(id) || !pinned.includes(afterId)) return pinned;
  const idIdx = pinned.indexOf(id);
  const afterIdx = pinned.indexOf(afterId);
  if (idIdx <= afterIdx + 1) return pinned;
  return addPinned(removePinned(pinned, id), id, afterIdx + 1);
}

function defaultPinnedIds(allIds: string[]): string[] {
  const picked = DEFAULT_PINNED_IDS.filter((id) => allIds.includes(id));
  for (const id of allIds) {
    if (!picked.includes(id)) picked.push(id);
  }
  return picked;
}

/** Keep stored order while dropping unknown ids and inserting newly seen ones in canonical order. */
export function normalizePinned(stored: string[], allIds: string[]): string[] {
  const known = new Set(allIds);
  let normalized =
    stored.filter((id) => known.has(id)).length > 0
      ? stored.filter((id) => known.has(id))
      : defaultPinnedIds(allIds);

  for (const id of allIds) {
    if (!normalized.includes(id)) normalized = insertInCanonicalOrder(normalized, id, allIds);
  }

  normalized = ensureAppAfter(normalized, "system:maps", "system:files");

  if (normalized.length === stored.length && normalized.every((id, i) => id === stored[i])) {
    return stored;
  }
  return normalized;
}
