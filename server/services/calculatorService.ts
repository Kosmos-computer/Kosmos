/**
 * System calculator service — safe expression evaluation and history for
 * os.calculator@1. Agents and the Calculator app share this store.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { CalculatorEntry } from "../../shared/capabilities/calculator.js";
import {
  formatCalcResult,
  safeEvaluate,
  type AngleMode,
} from "../../shared/math/safeEvaluate.js";
import { announceAppEvent } from "../bus.js";
import { dataDirs } from "../env.js";

function announceChange(): void {
  announceAppEvent("calculator.changed", { appId: "system" });
}

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(dataDirs.db, { recursive: true });
    db = new Database(path.join(dataDirs.db, "system-calculator.sqlite"));
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        expression TEXT NOT NULL,
        result TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_history_created ON history(createdAt DESC);
    `);
  }
  return db;
}

interface HistoryRow {
  id: string;
  expression: string;
  result: string;
  createdAt: string;
}

function toEntry(row: HistoryRow): CalculatorEntry {
  return row;
}

export { safeEvaluate };

export const calculatorService = {
  evaluate(
    expression: string,
    options: { angleMode?: AngleMode } = {},
  ): CalculatorEntry {
    const numeric = safeEvaluate(expression, { angleMode: options.angleMode ?? "DEG" });
    const result = formatCalcResult(numeric);
    const entry: CalculatorEntry = {
      id: crypto.randomUUID(),
      expression: expression.trim(),
      result,
      createdAt: new Date().toISOString(),
    };
    getDb()
      .prepare("INSERT INTO history (id, expression, result, createdAt) VALUES (@id, @expression, @result, @createdAt)")
      .run(entry);
    announceChange();
    return entry;
  },

  listHistory(params: { limit?: number } = {}): CalculatorEntry[] {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const rows = getDb()
      .prepare("SELECT id, expression, result, createdAt FROM history ORDER BY createdAt DESC LIMIT ?")
      .all(limit) as HistoryRow[];
    return rows.map(toEntry);
  },
};
