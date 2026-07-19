import { useCallback, useEffect, useMemo, useState } from "react";
import type { SessionSummary } from "@shared/types";
import type { BoardColumnId, WorkItem, WorkItemInput } from "@shared/capabilities/board";
import { BOARD_COLUMN_IDS } from "@shared/capabilities/board";
import { api } from "../../lib/api";
import { onAppEvent } from "../../os/appEventBus";
import { useStudioStore } from "../studio/studioStore";
import type { CreateWorkItemForm, LinkedSessionView, SessionRunState } from "./types";

function runStateForSession(sessionId: string): SessionRunState {
  const activity = useStudioStore.getState().sessionActivity[sessionId];
  if (!activity) return "idle";
  const running = activity.commands.some((command) => command.exitCode === null);
  if (running) return "streaming";
  return "idle";
}

export function useBoard(options: { projectId?: string | null } = {}) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sessionActivity = useStudioStore((s) => s.sessionActivity);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextItems, nextSessions] = await Promise.all([
        api.listWorkItems({
          archived: false,
          ...(options.projectId !== undefined ? { projectId: options.projectId } : {}),
        }),
        api.listSessions().catch(() => [] as SessionSummary[]),
      ]);
      setItems(nextItems);
      setSessions(nextSessions);
      setError(null);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Could not load board");
    } finally {
      setLoading(false);
    }
  }, [options.projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return onAppEvent((detail) => {
      if (detail.topic === "board.changed") void refresh();
    });
  }, [refresh]);

  const sessionTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const session of sessions) map.set(session.id, session.title);
    return map;
  }, [sessions]);

  const linkedSessionsFor = useCallback(
    (item: WorkItem): LinkedSessionView[] =>
      item.sessionIds.map((id) => ({
        id,
        title: sessionTitleById.get(id) ?? `Session ${id.slice(0, 6)}`,
        runState: runStateForSession(id),
      })),
    // sessionActivity re-evaluates run badges when Studio activity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionTitleById, sessionActivity],
  );

  const columns = useMemo(
    () =>
      BOARD_COLUMN_IDS.map((columnId) => ({
        id: columnId,
        items: items
          .filter((item) => item.columnId === columnId)
          .sort((a, b) => a.position - b.position || b.updatedAt.localeCompare(a.updatedAt)),
      })),
    [items],
  );

  const createItem = useCallback(
    async (input: CreateWorkItemForm) => {
      try {
        const created = await api.createWorkItem({
          title: input.title,
          description: input.description,
          columnId: input.columnId ?? "backlog",
          priority: input.priority,
          projectId: input.projectId ?? options.projectId ?? null,
          worktreePath: input.worktreePath,
          branch: input.branch,
          assignee: input.assignee,
        });
        await refresh();
        setSelectedId(created.id);
        return created;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create work item");
        return null;
      }
    },
    [options.projectId, refresh],
  );

  const updateItem = useCallback(
    async (id: string, patch: Partial<WorkItemInput>) => {
      try {
        await api.updateWorkItem(id, patch);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update work item");
      }
    },
    [refresh],
  );

  const moveItem = useCallback(
    async (id: string, columnId: BoardColumnId, position?: number) => {
      // Optimistic column move for snappy drag UX.
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, columnId, position: position ?? item.position, updatedAt: new Date().toISOString() }
            : item,
        ),
      );
      try {
        await api.moveWorkItem(id, columnId, position);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not move work item");
        await refresh();
      }
    },
    [refresh],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      try {
        await api.deleteWorkItem(id);
        setSelectedId((current) => (current === id ? null : current));
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete work item");
      }
    },
    [refresh],
  );

  const linkSession = useCallback(
    async (id: string, sessionId: string) => {
      const item = items.find((entry) => entry.id === id);
      if (!item || item.sessionIds.includes(sessionId)) return;
      await updateItem(id, { sessionIds: [...item.sessionIds, sessionId] });
    },
    [items, updateItem],
  );

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  return {
    items,
    columns,
    loading,
    error,
    selected,
    selectedId,
    setSelectedId,
    createItem,
    updateItem,
    moveItem,
    deleteItem,
    linkSession,
    linkedSessionsFor,
    refresh,
  };
}

export type BoardViewModel = ReturnType<typeof useBoard>;
