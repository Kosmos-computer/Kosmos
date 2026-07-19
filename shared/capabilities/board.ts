/**
 * os.board@1 — SDLC work-item board contract.
 *
 * Cards are work items (lifecycle columns). Linked Studio sessions are runs
 * shown as live status on the card, not as the card itself.
 */

export const BOARD_CONTRACT_ID = "os.board@1";

export type BoardColumnId = "backlog" | "ready" | "in_progress" | "review" | "done";
export type WorkItemPriority = "low" | "medium" | "high";
export type WorkItemAssigneeKind = "self" | "agent" | "contact" | "custom";

export const BOARD_COLUMN_IDS: BoardColumnId[] = [
  "backlog",
  "ready",
  "in_progress",
  "review",
  "done",
];

export interface WorkItemAssignee {
  kind: WorkItemAssigneeKind;
  name: string;
  contactId?: string;
}

export interface WorkItem {
  id: string;
  title: string;
  description: string | null;
  columnId: BoardColumnId;
  priority: WorkItemPriority | null;
  assignee: WorkItemAssignee | null;
  projectId: string | null;
  worktreePath: string | null;
  branch: string | null;
  sessionIds: string[];
  position: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkItemInput {
  title: string;
  description?: string;
  columnId?: BoardColumnId;
  priority?: WorkItemPriority;
  assignee?: WorkItemAssignee;
  projectId?: string | null;
  worktreePath?: string | null;
  branch?: string | null;
  sessionIds?: string[];
  position?: number;
  archived?: boolean;
}

export const BOARD_INTENTS = {
  "board.list": "read",
  "board.get": "read",
  "board.create": "write",
  "board.update": "write",
  "board.move": "write",
  "board.delete": "write",
} as const;

export type BoardIntentId = keyof typeof BOARD_INTENTS;

export const BOARD_INTENT_SCHEMAS: Record<BoardIntentId, Record<string, unknown>> = {
  "board.list": {
    type: "object",
    properties: {
      columnId: {
        type: "string",
        enum: ["backlog", "ready", "in_progress", "review", "done"],
      },
      projectId: { type: "string", description: "Filter by project id; omit for all" },
      archived: { type: "boolean" },
    },
  },
  "board.get": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  "board.create": {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      columnId: {
        type: "string",
        enum: ["backlog", "ready", "in_progress", "review", "done"],
      },
      priority: { type: "string", enum: ["low", "medium", "high"] },
      projectId: { type: "string" },
      worktreePath: { type: "string" },
      branch: { type: "string" },
      sessionIds: { type: "array", items: { type: "string" } },
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
  "board.update": {
    type: "object",
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      columnId: {
        type: "string",
        enum: ["backlog", "ready", "in_progress", "review", "done"],
      },
      priority: { type: "string", enum: ["low", "medium", "high"] },
      projectId: { type: "string" },
      worktreePath: { type: "string" },
      branch: { type: "string" },
      sessionIds: { type: "array", items: { type: "string" } },
      assignee: { type: "object" },
      archived: { type: "boolean" },
    },
    required: ["id"],
  },
  "board.move": {
    type: "object",
    properties: {
      id: { type: "string" },
      columnId: {
        type: "string",
        enum: ["backlog", "ready", "in_progress", "review", "done"],
      },
      position: { type: "number" },
    },
    required: ["id", "columnId"],
  },
  "board.delete": {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
};
