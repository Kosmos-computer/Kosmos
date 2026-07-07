/**
 * System tasks service — canonical store for os.tasks@1.
 */
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import Database from "better-sqlite3";
import type { Task, TaskAssignee, TaskInput, TaskPriority, TaskStatus } from "../../shared/capabilities/tasks.js";
import { dataDirs } from "../env.js";
import { announceAppEvent } from "../bus.js";

function announceChange(): void {
  announceAppEvent("tasks.changed", { appId: "system" });
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(dataDirs.db, { recursive: true });
    db = new Database(path.join(dataDirs.db, "system-tasks.sqlite"));
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        priority TEXT,
        assigneeJson TEXT,
        dueDateISO TEXT,
        archived INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(dueDateISO);
      CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived);
    `);
  }
  return db;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  assigneeJson: string | null;
  dueDateISO: string | null;
  archived: number;
  createdAt: string;
  updatedAt: string;
}

function parseAssignee(raw: string | null): TaskAssignee | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TaskAssignee;
  } catch {
    return null;
  }
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as TaskStatus,
    priority: (row.priority as TaskPriority | null) ?? null,
    assignee: parseAssignee(row.assigneeJson),
    dueDateISO: row.dueDateISO,
    archived: row.archived === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function assertDateISO(value: string, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must be YYYY-MM-DD, got "${value}"`);
  }
}

export interface TaskListParams {
  status?: TaskStatus;
  archived?: boolean;
  dueBefore?: string;
  dueAfter?: string;
}

export const tasksService = {
  list(params: TaskListParams = {}): Task[] {
    const clauses: string[] = [];
    const bind: Record<string, string | number> = {};

    if (params.archived === true) {
      clauses.push("archived = 1");
    } else if (params.archived !== undefined) {
      clauses.push("archived = 0");
    } else {
      clauses.push("archived = 0");
    }

    if (params.status) {
      clauses.push("status = $status");
      bind.status = params.status;
    }
    if (params.dueBefore) {
      assertDateISO(params.dueBefore, "dueBefore");
      clauses.push("(dueDateISO IS NOT NULL AND dueDateISO <= $dueBefore)");
      bind.dueBefore = params.dueBefore;
    }
    if (params.dueAfter) {
      assertDateISO(params.dueAfter, "dueAfter");
      clauses.push("(dueDateISO IS NOT NULL AND dueDateISO >= $dueAfter)");
      bind.dueAfter = params.dueAfter;
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = getDb()
      .prepare(
        `SELECT * FROM tasks ${where}
         ORDER BY
           CASE status WHEN 'in_progress' THEN 0 WHEN 'pending' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END,
           dueDateISO IS NULL,
           dueDateISO ASC,
           updatedAt DESC
         LIMIT 500`,
      )
      .all(bind) as TaskRow[];
    return rows.map(toTask);
  },

  get(id: string): Task | undefined {
    const row = getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
    return row ? toTask(row) : undefined;
  },

  create(input: TaskInput): Task {
    if (!input.title?.trim()) throw new Error("title is required");
    if (input.dueDateISO) assertDateISO(input.dueDateISO, "dueDateISO");
    const now = new Date().toISOString();
    const task: Task = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: input.status ?? "pending",
      priority: input.priority ?? null,
      assignee: input.assignee ?? null,
      dueDateISO: input.dueDateISO ?? null,
      archived: input.archived ?? false,
      createdAt: now,
      updatedAt: now,
    };
    getDb()
      .prepare(
        `INSERT INTO tasks (id, title, description, status, priority, assigneeJson, dueDateISO, archived, createdAt, updatedAt)
         VALUES ($id, $title, $description, $status, $priority, $assigneeJson, $dueDateISO, $archived, $createdAt, $updatedAt)`,
      )
      .run({
        ...task,
        assigneeJson: task.assignee ? JSON.stringify(task.assignee) : null,
        archived: task.archived ? 1 : 0,
      });
    announceChange();
    return task;
  },

  update(id: string, patch: Partial<TaskInput>): Task {
    const existing = this.get(id);
    if (!existing) throw new Error(`Task not found: ${id}`);
    if (patch.dueDateISO) assertDateISO(patch.dueDateISO, "dueDateISO");
    const next: Task = {
      ...existing,
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description.trim() || null } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority ?? null } : {}),
      ...(patch.assignee !== undefined ? { assignee: patch.assignee ?? null } : {}),
      ...(patch.dueDateISO !== undefined ? { dueDateISO: patch.dueDateISO ?? null } : {}),
      ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
      updatedAt: new Date().toISOString(),
    };
    getDb()
      .prepare(
        `UPDATE tasks SET title=$title, description=$description, status=$status, priority=$priority,
         assigneeJson=$assigneeJson, dueDateISO=$dueDateISO, archived=$archived, updatedAt=$updatedAt
         WHERE id=$id`,
      )
      .run({
        ...next,
        assigneeJson: next.assignee ? JSON.stringify(next.assignee) : null,
        archived: next.archived ? 1 : 0,
      });
    announceChange();
    return next;
  },

  complete(id: string, completed = true): Task {
    return this.update(id, { status: completed ? "completed" : "pending" });
  },

  archive(id: string, archived = true): Task {
    return this.update(id, { archived });
  },

  delete(id: string): boolean {
    const deleted = getDb().prepare("DELETE FROM tasks WHERE id = ?").run(id).changes > 0;
    if (deleted) announceChange();
    return deleted;
  },
};
