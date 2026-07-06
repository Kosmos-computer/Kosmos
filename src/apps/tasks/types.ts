export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";
export type TaskAssigneeKind = "self" | "agent" | "contact" | "custom";

export const TASK_ASSIGNEE_AGENT_NAME = "Agent";

export interface TaskAssignee {
  kind: TaskAssigneeKind;
  name: string;
  contactId?: string;
}

export function taskAssigneeLabel(assignee: TaskAssignee): string {
  return assignee.name;
}

export type TaskHistoryAction =
  | "created"
  | "completed"
  | "reopened"
  | "archived"
  | "restored"
  | "deleted"
  | "updated";

export interface TaskHistoryEvent {
  id: string;
  taskId: string;
  taskTitle: string;
  action: TaskHistoryAction;
  timestamp: string;
  detail?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  assignee?: TaskAssignee;
  dueDate?: string;
  dueDateISO?: string;
  archived?: boolean;
}

export const TASK_HISTORY_ACTION_LABEL: Record<TaskHistoryAction, string> = {
  created: "Created",
  completed: "Completed",
  reopened: "Reopened",
  archived: "Archived",
  restored: "Restored from archive",
  deleted: "Deleted",
  updated: "Updated",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "To do",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Input for creating or updating a task — matches the future os.tasks@1 create/update intent. */
export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDateISO?: string;
  assignee?: TaskAssignee;
}

export type UpdateTaskInput = CreateTaskInput;
