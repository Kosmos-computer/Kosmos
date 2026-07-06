/**
 * Conversation sidebar grouping — ported from OpenHands agent-canvas list helpers.
 * Groups chat sessions by workspace folder (project registry id); supports sort,
 * custom group order, and preview truncation inside expanded folders.
 */
import type { Project, SessionSummary } from "@shared/types";

export type OrganizeMode = "recent" | "grouped";
export type ConversationSortField = "created" | "updated";
export type GroupDropPosition = "before" | "after";

export const SANDBOX_GROUP_ID = "__sandbox";
export const GROUP_PREVIEW_LIMIT = 5;

export interface SessionGroup {
  id: string;
  label: string;
  projectId: string | null;
  sessions: SessionSummary[];
}

function groupIdForProject(projectId: string | null | undefined): string {
  return projectId ?? SANDBOX_GROUP_ID;
}

function parseTime(iso: string | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export function sortSessions(
  sessions: readonly SessionSummary[],
  field: ConversationSortField,
): SessionSummary[] {
  const key = field === "created" ? "createdAt" : "updatedAt";
  return [...sessions].sort((a, b) => parseTime(b[key]) - parseTime(a[key]));
}

export function groupSessionsByProject(
  sessions: readonly SessionSummary[],
  projects: readonly Project[],
  sortField: ConversationSortField,
  labels: { sandbox: string },
): SessionGroup[] {
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const byGroup = new Map<string, SessionSummary[]>();

  for (const session of sessions) {
    const gid = groupIdForProject(session.projectId);
    const list = byGroup.get(gid);
    if (list) list.push(session);
    else byGroup.set(gid, [session]);
  }

  const groups: SessionGroup[] = [
    {
      id: SANDBOX_GROUP_ID,
      label: labels.sandbox,
      projectId: null,
      sessions: sortSessions(byGroup.get(SANDBOX_GROUP_ID) ?? [], sortField),
    },
  ];

  for (const project of projects) {
    groups.push({
      id: project.id,
      label: project.name,
      projectId: project.id,
      sessions: sortSessions(byGroup.get(project.id) ?? [], sortField),
    });
  }

  // Sessions tied to removed projects still show under a fallback label.
  for (const [gid, items] of byGroup) {
    if (gid === SANDBOX_GROUP_ID || projectById.has(gid)) continue;
    groups.push({
      id: gid,
      label: "Removed project",
      projectId: gid,
      sessions: sortSessions(items, sortField),
    });
  }

  return groups;
}

export function applyGroupOrder<T extends { id: string }>(
  groups: readonly T[],
  order: readonly string[],
): T[] {
  if (order.length === 0) return [...groups];
  const byId = new Map(groups.map((g) => [g.id, g]));
  const ordered: T[] = [];
  const seen = new Set<string>();
  for (const id of order) {
    const group = byId.get(id);
    if (group) {
      ordered.push(group);
      seen.add(id);
    }
  }
  for (const group of groups) {
    if (!seen.has(group.id)) ordered.push(group);
  }
  return ordered;
}

export function moveGroupOrder(
  order: readonly string[],
  groupIds: readonly string[],
  activeGroupId: string,
  targetGroupId: string,
  position: GroupDropPosition = "after",
): string[] {
  if (activeGroupId === targetGroupId) return [...order];

  const effective = applyGroupOrder(
    groupIds.map((id) => ({ id })),
    order,
  ).map((g) => g.id);
  const fromIndex = effective.indexOf(activeGroupId);
  const toIndex = effective.indexOf(targetGroupId);
  if (fromIndex < 0 || toIndex < 0) return [...order];

  const next = [...effective];
  next.splice(fromIndex, 1);
  const adjusted = next.indexOf(targetGroupId);
  const insertIndex = position === "before" ? adjusted : adjusted + 1;
  next.splice(insertIndex, 0, activeGroupId);
  return next;
}

/** Pinned sessions in pin order (most-recently-pinned first), missing ids dropped. */
export function resolvePinnedSessions(
  pinnedIds: readonly string[],
  sessions: readonly SessionSummary[],
): SessionSummary[] {
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const resolved: SessionSummary[] = [];
  for (const id of pinnedIds) {
    const session = byId.get(id);
    if (session) resolved.push(session);
  }
  return resolved;
}

/** The rest of the list, with pinned sessions removed (they live in their own section). */
export function excludePinnedSessions(
  sessions: readonly SessionSummary[],
  pinnedIds: readonly string[],
): SessionSummary[] {
  if (pinnedIds.length === 0) return [...sessions];
  const pinnedSet = new Set(pinnedIds);
  return sessions.filter((s) => !pinnedSet.has(s.id));
}

export function getGroupSessionPreview(
  sessions: readonly SessionSummary[],
  options: { expanded: boolean; activeSessionId?: string; limit?: number },
): {
  visible: SessionSummary[];
  truncated: boolean;
  showingAll: boolean;
} {
  const limit = options.limit ?? GROUP_PREVIEW_LIMIT;
  if (options.expanded || sessions.length <= limit) {
    return {
      visible: [...sessions],
      truncated: sessions.length > limit,
      showingAll: true,
    };
  }

  const activeIndex =
    options.activeSessionId != null
      ? sessions.findIndex((s) => s.id === options.activeSessionId)
      : -1;

  if (activeIndex >= limit) {
    return {
      visible: [...sessions.slice(0, limit - 1), sessions[activeIndex]!],
      truncated: true,
      showingAll: false,
    };
  }

  return {
    visible: sessions.slice(0, limit),
    truncated: sessions.length > limit,
    showingAll: false,
  };
}
