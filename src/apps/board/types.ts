import type {
  BoardColumnId,
  WorkItem,
  WorkItemAssignee,
  WorkItemPriority,
} from "@shared/capabilities/board";
import { BOARD_COLUMN_IDS } from "@shared/capabilities/board";

export type { BoardColumnId, WorkItem, WorkItemAssignee, WorkItemPriority };
export { BOARD_COLUMN_IDS };

export type SessionRunState = "idle" | "streaming" | "blocked" | "error";

export const BOARD_COLUMN_LABEL: Record<BoardColumnId, string> = {
  backlog: "Backlog",
  ready: "Ready",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

export const SESSION_RUN_LABEL: Record<SessionRunState, string> = {
  idle: "Idle",
  streaming: "Running",
  blocked: "Blocked",
  error: "Error",
};

export interface LinkedSessionView {
  id: string;
  title: string;
  runState: SessionRunState;
}

export interface CreateWorkItemForm {
  title: string;
  description?: string;
  columnId?: BoardColumnId;
  priority?: WorkItemPriority;
  projectId?: string | null;
  worktreePath?: string | null;
  branch?: string | null;
  assignee?: WorkItemAssignee;
}
