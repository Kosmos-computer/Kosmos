import { useCallback, useEffect, useMemo, useState } from "react";
import type { Task as ApiTask } from "@shared/capabilities/tasks";
import { api } from "../../lib/api";
import { onAppEvent } from "../../os/appEventBus";
import { systemLaunchKey, useDocumentLaunchStore } from "../../os/documentLaunchStore";
import type {
  CreateTaskInput,
  TaskAssignee,
  TaskHistoryAction,
  TaskHistoryEvent,
  TaskItem,
  TaskStatus,
  UpdateTaskInput,
} from "./types";

const GROUP_ORDER: TaskStatus[] = ["in_progress", "pending", "completed", "cancelled"];

function todayISO(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDueDateLabel(iso: string): string {
  const today = todayISO();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  if (iso === today) return "Today";
  if (iso === tomorrowISO) return "Tomorrow";
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function assigneeSummary(assignee?: TaskAssignee): string | undefined {
  if (!assignee) return undefined;
  if (assignee.kind === "self") return "self";
  if (assignee.kind === "agent") return "agent";
  if (assignee.kind === "contact") return `contact ${assignee.name}`;
  return assignee.name;
}

function makeHistoryEvent(
  taskId: string,
  taskTitle: string,
  action: TaskHistoryAction,
  detail?: string,
): TaskHistoryEvent {
  return {
    id: `h${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    taskId,
    taskTitle,
    action,
    timestamp: new Date().toISOString(),
    detail,
  };
}

function apiTaskToItem(task: ApiTask): TaskItem {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    status: task.status,
    priority: task.priority ?? undefined,
    assignee: task.assignee ?? undefined,
    dueDateISO: task.dueDateISO ?? undefined,
    dueDate: task.dueDateISO ? formatDueDateLabel(task.dueDateISO) : undefined,
    archived: task.archived,
  };
}

interface DriveTaskFile {
  version: number;
  title: string;
  tasks: { id: string; title: string; done?: boolean }[];
}

function tasksFromDriveContent(content: string): { title: string; status?: "completed" }[] {
  const parsed = JSON.parse(content) as DriveTaskFile;
  return parsed.tasks.map((task) => ({
    title: task.title,
    ...(task.done ? { status: "completed" as const } : {}),
  }));
}

/** Tasks workspace — backed by os.tasks@1 via /api/tasks. */
export function useTasks() {
  const pendingLaunchId = useDocumentLaunchStore((s) => s.peek(systemLaunchKey("tasks")));
  const consumeLaunch = useDocumentLaunchStore((s) => s.consume);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [history, setHistory] = useState<TaskHistoryEvent[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [calendarWidth, setCalendarWidth] = useState(260);
  const [drawerWidth, setDrawerWidth] = useState(360);

  const refreshTasks = useCallback(async () => {
    setLoading(true);
    try {
      const next = await api.listTasks({ archived: false });
      setTasks(next.map(apiTaskToItem));
      setError(null);
    } catch (err) {
      setTasks([]);
      setError(err instanceof Error ? err.message : "Could not load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTasks();
  }, [refreshTasks]);

  useEffect(() => {
    return onAppEvent((detail) => {
      if (detail.topic === "tasks.changed") {
        void refreshTasks();
      }
    });
  }, [refreshTasks]);

  useEffect(() => {
    const launchId = consumeLaunch(systemLaunchKey("tasks"));
    if (!launchId) return;
    void (async () => {
      try {
        const file = await api.readDriveContent(launchId);
        const inputs = tasksFromDriveContent(file.content);
        for (const input of inputs) {
          await api.createTask(input);
        }
        await refreshTasks();
        setSelectedTaskId(null);
        setHistoryOpen(false);
      } catch {
        // Keep existing tasks when the Drive file cannot be read.
      }
    })();
  }, [consumeLaunch, pendingLaunchId, refreshTasks]);

  const appendHistory = useCallback((event: TaskHistoryEvent) => {
    setHistory((prev) => [event, ...prev]);
  }, []);

  const selectTask = useCallback((id: string) => {
    setSelectedTaskId(id);
    setHistoryOpen(false);
  }, []);

  const closeDrawer = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  const toggleComplete = useCallback(
    async (id: string) => {
      const task = tasks.find((item) => item.id === id);
      if (!task) return;
      const completed = task.status !== "completed";
      try {
        await api.completeTask(id, completed);
        appendHistory(
          makeHistoryEvent(
            task.id,
            task.title,
            completed ? "completed" : "reopened",
            completed ? "Marked complete" : "Marked incomplete",
          ),
        );
        await refreshTasks();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update task");
      }
    },
    [appendHistory, refreshTasks, tasks],
  );

  const addTask = useCallback(
    async (input: CreateTaskInput) => {
      try {
        const created = await api.createTask(input);
        appendHistory(makeHistoryEvent(created.id, created.title, "created", "Added manually"));
        await refreshTasks();
        setSelectedTaskId(created.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create task");
      }
    },
    [appendHistory, refreshTasks],
  );

  const updateTask = useCallback(
    async (id: string, input: UpdateTaskInput) => {
      const task = tasks.find((item) => item.id === id);
      if (!task) return;

      const changes: string[] = [];
      if (task.title !== input.title) changes.push("title");
      if ((task.description ?? "") !== (input.description ?? "")) changes.push("description");
      if (task.priority !== input.priority) changes.push("priority");
      if ((task.dueDateISO ?? "") !== (input.dueDateISO ?? "")) changes.push("due date");
      if ((task.assignee?.kind ?? "") !== (input.assignee?.kind ?? "")) changes.push("assignee");
      else if ((task.assignee?.name ?? "") !== (input.assignee?.name ?? "")) changes.push("assignee");

      const assigneeDetail = assigneeSummary(input.assignee);
      const detail =
        changes.length > 0
          ? `Updated ${changes.join(", ")}${assigneeDetail ? ` · assigned to ${assigneeDetail}` : ""}`
          : assigneeDetail
            ? `Assigned to ${assigneeDetail}`
            : "Saved changes";

      try {
        await api.updateTask(id, input);
        appendHistory(makeHistoryEvent(id, input.title, "updated", detail));
        await refreshTasks();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update task");
      }
    },
    [appendHistory, refreshTasks, tasks],
  );

  const archiveTask = useCallback(
    async (id: string) => {
      const task = tasks.find((item) => item.id === id);
      if (!task || task.archived) return;
      try {
        await api.updateTask(id, { archived: true });
        appendHistory(makeHistoryEvent(task.id, task.title, "archived"));
        setSelectedTaskId(null);
        await refreshTasks();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not archive task");
      }
    },
    [appendHistory, refreshTasks, tasks],
  );

  const restoreTask = useCallback(
    async (id: string) => {
      const task = tasks.find((item) => item.id === id);
      if (!task || !task.archived) return;
      try {
        await api.updateTask(id, { archived: false });
        appendHistory(makeHistoryEvent(task.id, task.title, "restored"));
        await refreshTasks();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not restore task");
      }
    },
    [appendHistory, refreshTasks, tasks],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const task = tasks.find((item) => item.id === id);
      if (!task) return;
      try {
        await api.deleteTask(id);
        appendHistory(makeHistoryEvent(task.id, task.title, "deleted"));
        setSelectedTaskId((current) => (current === id ? null : current));
        await refreshTasks();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete task");
      }
    },
    [appendHistory, refreshTasks, tasks],
  );

  const activeTasks = useMemo(() => tasks.filter((task) => !task.archived), [tasks]);

  const dateFilteredTasks = useMemo(() => {
    if (!selectedDate) return activeTasks;
    return activeTasks.filter((task) => task.dueDateISO === selectedDate);
  }, [activeTasks, selectedDate]);

  const highlightedDates = useMemo(
    () => activeTasks.map((task) => task.dueDateISO).filter((iso): iso is string => Boolean(iso)),
    [activeTasks],
  );

  const groups = useMemo(
    () =>
      GROUP_ORDER.map((status) => ({
        status,
        items: dateFilteredTasks.filter((task) => task.status === status),
      })).filter((group) => group.items.length > 0),
    [dateFilteredTasks],
  );

  useEffect(() => {
    if (!selectedDate || !selectedTaskId) return;
    const task = tasks.find((item) => item.id === selectedTaskId);
    if (task && task.dueDateISO !== selectedDate) {
      setSelectedTaskId(null);
    }
  }, [selectedDate, selectedTaskId, tasks]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const taskHistory = useMemo(() => {
    if (!selectedTaskId) return [];
    return history.filter((event) => event.taskId === selectedTaskId);
  }, [history, selectedTaskId]);

  const sortedHistory = useMemo(
    () => [...history].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [history],
  );

  const openCount = dateFilteredTasks.filter(
    (task) => task.status !== "completed" && task.status !== "cancelled",
  ).length;

  const handlePrevMonth = useCallback(() => {
    setCalendarMonth((month) => {
      if (month === 0) {
        setCalendarYear((year) => year - 1);
        return 11;
      }
      return month - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setCalendarMonth((month) => {
      if (month === 11) {
        setCalendarYear((year) => year + 1);
        return 0;
      }
      return month + 1;
    });
  }, []);

  const handleToday = useCallback(() => {
    const date = new Date();
    setCalendarMonth(date.getMonth());
    setCalendarYear(date.getFullYear());
    setSelectedDate(todayISO());
  }, []);

  return {
    tasks,
    groups,
    openCount,
    selectedTaskId,
    selectedTask,
    selectTask,
    closeDrawer,
    toggleComplete,
    addTask,
    updateTask,
    archiveTask,
    restoreTask,
    deleteTask,
    history,
    taskHistory,
    sortedHistory,
    historyOpen,
    setHistoryOpen,
    calendarMonth,
    calendarYear,
    selectedDate,
    setSelectedDate,
    defaultDueDateISO: todayISO(),
    highlightedDates,
    handlePrevMonth,
    handleNextMonth,
    handleToday,
    calendarWidth,
    setCalendarWidth,
    drawerWidth,
    setDrawerWidth,
    loading,
    error,
  };
}

export type TasksViewModel = ReturnType<typeof useTasks>;
