/**
 * os.tasks@1 — the system task list contract.
 *
 * The OS owns the canonical task store (server/services/tasksService.ts).
 * The Tasks app, menu bar helper, and agent all read/write the same data.
 */

export const TASKS_CONTRACT_ID = "os.tasks@1";

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";
export type TaskAssigneeKind = "self" | "agent" | "contact" | "custom";

export interface TaskAssignee {
  kind: TaskAssigneeKind;
  name: string;
  contactId?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  assignee: TaskAssignee | null;
  dueDateISO: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: TaskAssignee;
  dueDateISO?: string;
  archived?: boolean;
}

export const TASKS_INTENTS = {
  "tasks.list": "read",
  "tasks.get": "read",
  "tasks.create": "write",
  "tasks.update": "write",
  "tasks.complete": "write",
  "tasks.archive": "write",
  "tasks.delete": "write",
} as const;

export type TasksIntentId = keyof typeof TASKS_INTENTS;

export const TASKS_INTENT_SCHEMAS: Record<TasksIntentId, Record<string, unknown>> = {
  "tasks.list": {
    type: "object",
    properties: {
      status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"] },
      archived: { type: "boolean", description: "When false (default), only active tasks" },
      dueBefore: { type: "string", description: "ISO date (YYYY-MM-DD) — due on or before" },
      dueAfter: { type: "string", description: "ISO date (YYYY-MM-DD) — due on or after" },
    },
  },
  "tasks.get": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  "tasks.create": {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"] },
      priority: { type: "string", enum: ["low", "medium", "high"] },
      dueDateISO: { type: "string", description: "ISO date YYYY-MM-DD" },
      assignee: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["self", "agent", "contact", "custom"] },
          name: { type: "string" },
          contactId: { type: "string" },
        },
        required: ["kind", "name"],
      },
    },
    required: ["title"],
  },
  "tasks.update": {
    type: "object",
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"] },
      priority: { type: "string", enum: ["low", "medium", "high"] },
      dueDateISO: { type: "string" },
      assignee: { type: "object" },
      archived: { type: "boolean" },
    },
    required: ["id"],
  },
  "tasks.complete": {
    type: "object",
    properties: {
      id: { type: "string" },
      completed: { type: "boolean", description: "true to mark done, false to reopen" },
    },
    required: ["id"],
  },
  "tasks.archive": {
    type: "object",
    properties: {
      id: { type: "string" },
      archived: { type: "boolean" },
    },
    required: ["id"],
  },
  "tasks.delete": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
};
