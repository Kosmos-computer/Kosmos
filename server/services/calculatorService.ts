/**
 * System calculator service — safe expression evaluation and history for
 * os.calculator@1. Agents and the Calculator app share this store.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { CalculatorEntry } from "../../shared/capabilities/calculator.js";
import { announceAppEvent } from "../bus.js";
import { dataDirs } from "../env.js";

const MAX_DISPLAY_LENGTH = 10;

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

function formatResult(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  const rounded = Math.round(value * 1e10) / 1e10;
  const text = String(rounded);
  if (text.length <= MAX_DISPLAY_LENGTH) return text;
  return rounded.toPrecision(MAX_DISPLAY_LENGTH - 2).replace(/\.?0+$/, "");
}

/** Tokenize and evaluate a basic arithmetic expression without eval/Function. */
export function safeEvaluate(expression: string): number {
  const src = expression.trim();
  if (!src) throw new Error("Expression is empty");
  if (!/^[\d\s+\-*/().%]+$/.test(src)) {
    throw new Error("Expression contains unsupported characters");
  }

  let i = 0;

  function skipSpace() {
    while (i < src.length && /\s/.test(src[i]!)) i += 1;
  }

  function parseNumber(): number {
    skipSpace();
    const start = i;
    if (src[i] === "-") i += 1;
    while (i < src.length && /[\d.]/.test(src[i]!)) i += 1;
    const token = src.slice(start, i);
    if (!token || token === "-" || token === ".") throw new Error("Invalid number");
    const value = Number.parseFloat(token);
    if (!Number.isFinite(value)) throw new Error("Invalid number");
    return value;
  }

  function parseFactor(): number {
    skipSpace();
    if (src[i] === "(") {
      i += 1;
      const value = parseExpression();
      skipSpace();
      if (src[i] !== ")") throw new Error("Missing closing parenthesis");
      i += 1;
      return value;
    }
    if (src[i] === "-") {
      i += 1;
      return -parseFactor();
    }
    return parseNumber();
  }

  function parseTerm(): number {
    let value = parseFactor();
    for (;;) {
      skipSpace();
      const op = src[i];
      if (op === "*") {
        i += 1;
        value *= parseFactor();
      } else if (op === "/") {
        i += 1;
        const rhs = parseFactor();
        if (rhs === 0) throw new Error("Division by zero");
        value /= rhs;
      } else if (op === "%") {
        i += 1;
        value %= parseFactor();
      } else {
        break;
      }
    }
    return value;
  }

  function parseExpression(): number {
    let value = parseTerm();
    for (;;) {
      skipSpace();
      const op = src[i];
      if (op === "+") {
        i += 1;
        value += parseTerm();
      } else if (op === "-") {
        i += 1;
        value -= parseTerm();
      } else {
        break;
      }
    }
    return value;
  }

  const result = parseExpression();
  skipSpace();
  if (i !== src.length) throw new Error("Unexpected characters in expression");
  return result;
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

export const calculatorService = {
  evaluate(expression: string): CalculatorEntry {
    const numeric = safeEvaluate(expression);
    const result = formatResult(numeric);
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
