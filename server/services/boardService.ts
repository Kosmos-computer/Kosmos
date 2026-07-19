/**
 * System board service — canonical store for os.board@1 work items.
 */
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import type {
  BoardColumnId,
  WorkItem,
  WorkItemAssignee,
  WorkItemInput,
  WorkItemPriority,
} from "../../shared/capabilities/board.js";
import { BOARD_COLUMN_IDS } from "../../shared/capabilities/board.js";
import { dataDirs } from "../env.js";
import { announceAppEvent } from "../bus.js";

function announceChange(): void {
  announceAppEvent("board.changed", { appId: "system" });
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(dataDirs.db, { recursive: true });
    db = new Database(path.join(dataDirs.db, "system-board.sqlite"));
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS work_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        columnId TEXT NOT NULL DEFAULT 'backlog',
        priority TEXT,
        assigneeJson TEXT,
        projectId TEXT,
        worktreePath TEXT,
        branch TEXT,
        sessionIdsJson TEXT NOT NULL DEFAULT '[]',
        position REAL NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_work_items_column ON work_items(columnId);
      CREATE INDEX IF NOT EXISTS idx_work_items_project ON work_items(projectId);
      CREATE INDEX IF NOT EXISTS idx_work_items_archived ON work_items(archived);
    `);
  }
  return db;
}

interface WorkItemRow {
  id: string;
  title: string;
  description: string | null;
  columnId: string;
  priority: string | null;
  assigneeJson: string | null;
  projectId: string | null;
  worktreePath: string | null;
  branch: string | null;
  sessionIdsJson: string;
  position: number;
  archived: number;
  createdAt: string;
  updatedAt: string;
}

function parseAssignee(raw: string | null): WorkItemAssignee | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WorkItemAssignee;
  } catch {
    return null;
  }
}

function parseSessionIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function assertColumnId(value: string): BoardColumnId {
  if (!BOARD_COLUMN_IDS.includes(value as BoardColumnId)) {
    throw new Error(`Invalid columnId: ${value}`);
  }
  return value as BoardColumnId;
}

function toWorkItem(row: WorkItemRow): WorkItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    columnId: assertColumnId(row.columnId),
    priority: (row.priority as WorkItemPriority | null) ?? null,
    assignee: parseAssignee(row.assigneeJson),
    projectId: row.projectId,
    worktreePath: row.worktreePath,
    branch: row.branch,
    sessionIds: parseSessionIds(row.sessionIdsJson),
    position: row.position,
    archived: row.archived === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function nextPosition(columnId: BoardColumnId): number {
  const row = getDb()
    .prepare(
      `SELECT MAX(position) AS maxPos FROM work_items WHERE columnId = ? AND archived = 0`,
    )
    .get(columnId) as { maxPos: number | null };
  return (row.maxPos ?? 0) + 1;
}

export interface WorkItemListParams {
  columnId?: BoardColumnId;
  projectId?: string | null;
  archived?: boolean;
}

export const boardService = {
  list(params: WorkItemListParams = {}): WorkItem[] {
    const clauses: string[] = [];
    const bind: Record<string, string | number> = {};

    if (params.archived === true) {
      clauses.push("archived = 1");
    } else {
      clauses.push("archived = 0");
    }

    if (params.columnId) {
      clauses.push("columnId = $columnId");
      bind.columnId = params.columnId;
    }

    if (params.projectId === null) {
      clauses.push("projectId IS NULL");
    } else if (params.projectId !== undefined) {
      clauses.push("projectId = $projectId");
      bind.projectId = params.projectId;
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = getDb()
      .prepare(
        `SELECT * FROM work_items ${where}
         ORDER BY
           CASE columnId
             WHEN 'backlog' THEN 0
             WHEN 'ready' THEN 1
             WHEN 'in_progress' THEN 2
             WHEN 'review' THEN 3
             WHEN 'done' THEN 4
             ELSE 5
           END,
           position ASC,
           updatedAt DESC
         LIMIT 1000`,
      )
      .all(bind) as WorkItemRow[];
    return rows.map(toWorkItem);
  },

  get(id: string): WorkItem | undefined {
    const row = getDb().prepare("SELECT * FROM work_items WHERE id = ?").get(id) as
      | WorkItemRow
      | undefined;
    return row ? toWorkItem(row) : undefined;
  },

  /** Find the work item that lists this Studio session (first match). */
  findBySessionId(sessionId: string): WorkItem | undefined {
    const rows = getDb()
      .prepare(`SELECT * FROM work_items WHERE archived = 0 LIMIT 1000`)
      .all() as WorkItemRow[];
    for (const row of rows) {
      const item = toWorkItem(row);
      if (item.sessionIds.includes(sessionId)) return item;
    }
    return undefined;
  },

  /** Link a session onto a card (idempotent) and optionally promote Ready/Backlog → In progress. */
  linkSession(id: string, sessionId: string, opts?: { promoteInProgress?: boolean }): WorkItem {
    const existing = this.get(id);
    if (!existing) throw new Error(`Work item not found: ${id}`);
    const sessionIds = existing.sessionIds.includes(sessionId)
      ? existing.sessionIds
      : [...existing.sessionIds, sessionId];
    const shouldPromote =
      opts?.promoteInProgress !== false &&
      (existing.columnId === "ready" || existing.columnId === "backlog");
    return this.update(id, {
      sessionIds,
      ...(shouldPromote ? { columnId: "in_progress" as const } : {}),
    });
  },

  create(input: WorkItemInput): WorkItem {
    if (!input.title?.trim()) throw new Error("title is required");
    const columnId = input.columnId ? assertColumnId(input.columnId) : "backlog";
    const now = new Date().toISOString();
    const item: WorkItem = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      columnId,
      priority: input.priority ?? null,
      assignee: input.assignee ?? null,
      projectId: input.projectId ?? null,
      worktreePath: input.worktreePath ?? null,
      branch: input.branch ?? null,
      sessionIds: input.sessionIds ?? [],
      position: input.position ?? nextPosition(columnId),
      archived: input.archived ?? false,
      createdAt: now,
      updatedAt: now,
    };
    getDb()
      .prepare(
        `INSERT INTO work_items (
           id, title, description, columnId, priority, assigneeJson, projectId,
           worktreePath, branch, sessionIdsJson, position, archived, createdAt, updatedAt
         ) VALUES (
           $id, $title, $description, $columnId, $priority, $assigneeJson, $projectId,
           $worktreePath, $branch, $sessionIdsJson, $position, $archived, $createdAt, $updatedAt
         )`,
      )
      .run({
        ...item,
        assigneeJson: item.assignee ? JSON.stringify(item.assignee) : null,
        sessionIdsJson: JSON.stringify(item.sessionIds),
        archived: item.archived ? 1 : 0,
      });
    announceChange();
    return item;
  },

  update(id: string, patch: Partial<WorkItemInput>): WorkItem {
    const existing = this.get(id);
    if (!existing) throw new Error(`Work item not found: ${id}`);
    if (patch.columnId) assertColumnId(patch.columnId);

    const next: WorkItem = {
      ...existing,
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description.trim() || null }
        : {}),
      ...(patch.columnId !== undefined ? { columnId: patch.columnId } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority ?? null } : {}),
      ...(patch.assignee !== undefined ? { assignee: patch.assignee ?? null } : {}),
      ...(patch.projectId !== undefined ? { projectId: patch.projectId ?? null } : {}),
      ...(patch.worktreePath !== undefined ? { worktreePath: patch.worktreePath ?? null } : {}),
      ...(patch.branch !== undefined ? { branch: patch.branch ?? null } : {}),
      ...(patch.sessionIds !== undefined ? { sessionIds: patch.sessionIds } : {}),
      ...(patch.position !== undefined ? { position: patch.position } : {}),
      ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
      updatedAt: new Date().toISOString(),
    };

    getDb()
      .prepare(
        `UPDATE work_items SET
           title=$title, description=$description, columnId=$columnId, priority=$priority,
           assigneeJson=$assigneeJson, projectId=$projectId, worktreePath=$worktreePath,
           branch=$branch, sessionIdsJson=$sessionIdsJson, position=$position,
           archived=$archived, updatedAt=$updatedAt
         WHERE id=$id`,
      )
      .run({
        ...next,
        assigneeJson: next.assignee ? JSON.stringify(next.assignee) : null,
        sessionIdsJson: JSON.stringify(next.sessionIds),
        archived: next.archived ? 1 : 0,
      });
    announceChange();
    return next;
  },

  move(id: string, columnId: BoardColumnId, position?: number): WorkItem {
    assertColumnId(columnId);
    return this.update(id, {
      columnId,
      position: position ?? nextPosition(columnId),
    });
  },

  delete(id: string): boolean {
    const deleted = getDb().prepare("DELETE FROM work_items WHERE id = ?").run(id).changes > 0;
    if (deleted) announceChange();
    return deleted;
  },
};
