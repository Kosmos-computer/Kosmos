import type { TaskItem } from "./types";
import { TASK_ASSIGNEE_AGENT_NAME } from "./types";

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** STUB: replace with productivity store when os.tasks@1 exists. */
export const TASKS_MOCK: TaskItem[] = [
  {
    id: "t1",
    title: "Confirm pavilion rental",
    description: "Verify setup window, power access, and rain backup hold.",
    status: "in_progress",
    priority: "high",
    assignee: { kind: "self", name: "You" },
    dueDate: "Today",
    dueDateISO: addDays(0),
  },
  {
    id: "t2",
    title: "Finalize catering headcount",
    status: "in_progress",
    priority: "medium",
    assignee: { kind: "agent", name: TASK_ASSIGNEE_AGENT_NAME },
    dueDate: "Fri",
    dueDateISO: addDays(3),
  },
  {
    id: "t3",
    title: "Book cleanup volunteer shift",
    description: "Still need two volunteers for the 2:30 PM teardown block.",
    status: "pending",
    priority: "low",
    dueDate: "Next week",
    dueDateISO: addDays(7),
  },
  {
    id: "t4",
    title: "Print picnic posters and maps",
    status: "pending",
    priority: "medium",
    assignee: { kind: "contact", name: "Jordan Hayes", contactId: "p2" },
  },
  {
    id: "t5",
    title: "Draft volunteer shift schedule",
    status: "completed",
    priority: "medium",
    assignee: { kind: "contact", name: "Sam Patel", contactId: "p3" },
  },
  {
    id: "t6",
    title: "Retire last year's signup form",
    status: "cancelled",
    assignee: { kind: "custom", name: "Volunteer coordinator" },
  },
];
