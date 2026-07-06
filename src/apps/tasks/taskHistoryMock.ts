import type { TaskHistoryEvent } from "./types";

function daysAgo(days: number, hour = 10): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

/** STUB: replace with productivity store when os.tasks@1 exists. */
export const TASK_HISTORY_MOCK: TaskHistoryEvent[] = [
  {
    id: "h1",
    taskId: "t1",
    taskTitle: "Confirm pavilion rental",
    action: "created",
    timestamp: daysAgo(5),
    detail: "Added by Alex Morgan",
  },
  {
    id: "h2",
    taskId: "t1",
    taskTitle: "Confirm pavilion rental",
    action: "updated",
    timestamp: daysAgo(3),
    detail: "Marked in progress",
  },
  {
    id: "h3",
    taskId: "t5",
    taskTitle: "Draft volunteer shift schedule",
    action: "completed",
    timestamp: daysAgo(2, 14),
  },
  {
    id: "h4",
    taskId: "t6",
    taskTitle: "Retire last year's signup form",
    action: "archived",
    timestamp: daysAgo(1),
  },
];
