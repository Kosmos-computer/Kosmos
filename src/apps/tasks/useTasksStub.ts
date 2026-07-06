import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { systemLaunchKey, useDocumentLaunchStore } from "../../os/documentLaunchStore";
import { TASK_HISTORY_MOCK } from "./taskHistoryMock";
import { TASKS_MOCK } from "./tasksMock";
import type { CreateTaskInput, TaskAssignee, TaskHistoryAction, TaskHistoryEvent, TaskItem, TaskStatus, UpdateTaskInput } from "./types";

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

interface DriveTaskFile {
  version: number;
  title: string;
  tasks: { id: string; title: string; done?: boolean }[];
}

function tasksFromDriveContent(content: string): TaskItem[] {
  const parsed = JSON.parse(content) as DriveTaskFile;
  return parsed.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.done ? "completed" : "pending",
  }));
}

/** STUB: replace with useTasksStore when os.tasks@1 exists. */
export function useTasksStub() {
  const pendingLaunchId = useDocumentLaunchStore((s) => s.peek(systemLaunchKey("tasks")));
  const consumeLaunch = useDocumentLaunchStore((s) => s.consume);

  const [tasks, setTasks] = useState<TaskItem[]>(TASKS_MOCK);
  const [history, setHistory] = useState<TaskHistoryEvent[]>(TASK_HISTORY_MOCK);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [calendarWidth, setCalendarWidth] = useState(260);
  const [drawerWidth, setDrawerWidth] = useState(360);

  useEffect(() => {
    const launchId = consumeLaunch(systemLaunchKey("tasks"));
    if (!launchId) return;
    void (async () => {
      try {
        const file = await api.readDriveContent(launchId);
        setTasks(tasksFromDriveContent(file.content));
        setSelectedTaskId(null);
        setHistoryOpen(false);
      } catch {
        // Keep mock tasks when the Drive file cannot be read.
      }
    })();
  }, [consumeLaunch, pendingLaunchId]);

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
    (id: string) => {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== id) return task;
          const completed = task.status === "completed";
          const nextStatus = completed ? "pending" : "completed";
          appendHistory(
            makeHistoryEvent(
              task.id,
              task.title,
              completed ? "reopened" : "completed",
              completed ? "Marked incomplete" : "Marked complete",
            ),
          );
          return { ...task, status: nextStatus };
        }),
      );
    },
    [appendHistory],
  );

  const addTask = useCallback(
    (input: CreateTaskInput) => {
      const task: TaskItem = {
        id: `t${Date.now()}`,
        title: input.title,
        description: input.description,
        status: "pending",
        priority: input.priority,
        assignee: input.assignee,
        dueDateISO: input.dueDateISO,
        dueDate: input.dueDateISO ? formatDueDateLabel(input.dueDateISO) : undefined,
      };
      setTasks((prev) => [task, ...prev]);
      appendHistory(makeHistoryEvent(task.id, task.title, "created", "Added manually"));
      setSelectedTaskId(task.id);
    },
    [appendHistory],
  );

  const updateTask = useCallback(
    (id: string, input: UpdateTaskInput) => {
      setTasks((prev) => {
        const task = prev.find((item) => item.id === id);
        if (!task) return prev;

        const changes: string[] = [];
        if (task.title !== input.title) changes.push("title");
        if ((task.description ?? "") !== (input.description ?? "")) changes.push("description");
        if (task.priority !== input.priority) changes.push("priority");
        if ((task.dueDateISO ?? "") !== (input.dueDateISO ?? "")) changes.push("due date");
        if ((task.assignee?.kind ?? "") !== (input.assignee?.kind ?? "")) changes.push("assignee");
        else if ((task.assignee?.name ?? "") !== (input.assignee?.name ?? "")) changes.push("assignee");

        const updated: TaskItem = {
          ...task,
          title: input.title,
          description: input.description,
          priority: input.priority,
          assignee: input.assignee,
          dueDateISO: input.dueDateISO,
          dueDate: input.dueDateISO ? formatDueDateLabel(input.dueDateISO) : undefined,
        };

        const assigneeDetail = assigneeSummary(input.assignee);
        const detail =
          changes.length > 0
            ? `Updated ${changes.join(", ")}${assigneeDetail ? ` · assigned to ${assigneeDetail}` : ""}`
            : assigneeDetail
              ? `Assigned to ${assigneeDetail}`
              : "Saved changes";

        appendHistory(makeHistoryEvent(task.id, updated.title, "updated", detail));

        return prev.map((item) => (item.id === id ? updated : item));
      });
    },
    [appendHistory],
  );

  const archiveTask = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const task = prev.find((item) => item.id === id);
        if (!task || task.archived) return prev;
        appendHistory(makeHistoryEvent(task.id, task.title, "archived"));
        return prev.map((item) => (item.id === id ? { ...item, archived: true } : item));
      });
      setSelectedTaskId(null);
    },
    [appendHistory],
  );

  const restoreTask = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const task = prev.find((item) => item.id === id);
        if (!task || !task.archived) return prev;
        appendHistory(makeHistoryEvent(task.id, task.title, "restored"));
        return prev.map((item) => (item.id === id ? { ...item, archived: false } : item));
      });
    },
    [appendHistory],
  );

  const deleteTask = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const task = prev.find((item) => item.id === id);
        if (!task) return prev;
        appendHistory(makeHistoryEvent(task.id, task.title, "deleted"));
        return prev.filter((item) => item.id !== id);
      });
      setSelectedTaskId((current) => (current === id ? null : current));
    },
    [appendHistory],
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
  };
}

export type TasksViewModel = ReturnType<typeof useTasksStub>;
