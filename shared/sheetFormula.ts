/**
 * Lightweight spreadsheet formula engine for the Arco Sheets authoring surface.
 * Supports arithmetic, cell refs, ranges, and SUM/AVERAGE/MIN/MAX/COUNT/IF.
 */

export type CellMap = Record<string, { value?: string | number; formula?: string }>;

function colToIndex(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function indexToCol(index: number): string {
  let label = "";
  let value = index;
  while (value >= 0) {
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26) - 1;
  }
  return label;
}

export function parseA1(address: string): { col: number; row: number } | null {
  const m = address.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  return { col: colToIndex(m[1]), row: Number(m[2]) - 1 };
}

export function formatA1(col: number, row: number): string {
  return `${indexToCol(col)}${row + 1}`;
}

export function expandRange(range: string): string[] {
  const parts = range.split(":");
  if (parts.length === 1) {
    const one = parseA1(parts[0]);
    return one ? [formatA1(one.col, one.row)] : [];
  }
  const a = parseA1(parts[0]);
  const b = parseA1(parts[1]);
  if (!a || !b) return [];
  const out: string[] = [];
  for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
    for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
      out.push(formatA1(c, r));
    }
  }
  return out;
}

function rawValue(cells: CellMap, addr: string, visiting: Set<string>): number | string {
  const cell = cells[addr];
  if (!cell) return 0;
  if (cell.formula?.startsWith("=")) {
    if (visiting.has(addr)) return "#CYCLE!";
    visiting.add(addr);
    const result = evaluateFormula(cell.formula, cells, visiting);
    visiting.delete(addr);
    return result;
  }
  if (typeof cell.value === "number") return cell.value;
  if (typeof cell.value === "string") {
    const n = Number(cell.value);
    return Number.isFinite(n) && cell.value.trim() !== "" ? n : cell.value;
  }
  return 0;
}

function toNumber(v: number | string): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function evalArgs(argsSrc: string, cells: CellMap, visiting: Set<string>): (number | string)[] {
  const args: (number | string)[] = [];
  let depth = 0;
  let current = "";
  for (const ch of argsSrc) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      args.push(...flattenArg(current.trim(), cells, visiting));
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) args.push(...flattenArg(current.trim(), cells, visiting));
  return args;
}

function flattenArg(token: string, cells: CellMap, visiting: Set<string>): (number | string)[] {
  if (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(token)) {
    return expandRange(token).map((addr) => rawValue(cells, addr, visiting));
  }
  if (/^[A-Z]+\d+$/i.test(token)) {
    return [rawValue(cells, token.toUpperCase(), visiting)];
  }
  return [evaluateExpr(token, cells, visiting)];
}

function evaluateExpr(expr: string, cells: CellMap, visiting: Set<string>): number | string {
  const trimmed = expr.trim();
  if (!trimmed) return 0;

  // Replace cell refs with values (simple left-to-right token approach)
  const replaced = trimmed.replace(/([A-Z]+\d+(?::[A-Z]+\d+)?)/gi, (ref) => {
    if (ref.includes(":")) {
      // ranges only valid inside functions
      return "0";
    }
    const v = rawValue(cells, ref.toUpperCase(), visiting);
    return typeof v === "number" ? String(v) : JSON.stringify(String(v));
  });

  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${replaced});`)();
    if (typeof result === "number" && Number.isFinite(result)) return result;
    if (typeof result === "string" || typeof result === "boolean") return result as number | string;
    return String(result ?? "");
  } catch {
    return "#ERROR!";
  }
}

export function evaluateFormula(
  formula: string,
  cells: CellMap,
  visiting: Set<string> = new Set(),
): number | string {
  const body = formula.trim().startsWith("=") ? formula.trim().slice(1) : formula.trim();
  const fnMatch = body.match(/^([A-Z]+)\(([\s\S]*)\)$/i);
  if (fnMatch) {
    const name = fnMatch[1].toUpperCase();
    const args = evalArgs(fnMatch[2], cells, visiting);
    const nums = args.map(toNumber);
    switch (name) {
      case "SUM":
        return nums.reduce((a, b) => a + b, 0);
      case "AVERAGE":
      case "AVG":
        return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
      case "MIN":
        return nums.length ? Math.min(...nums) : 0;
      case "MAX":
        return nums.length ? Math.max(...nums) : 0;
      case "COUNT":
        return args.filter((v) => typeof v === "number" || (typeof v === "string" && v !== "" && Number.isFinite(Number(v)))).length;
      case "IF": {
        const cond = args[0];
        const truthy = typeof cond === "number" ? cond !== 0 : Boolean(cond) && cond !== "FALSE";
        return truthy ? (args[1] ?? 0) : (args[2] ?? 0);
      }
      default:
        return `#NAME?`;
    }
  }
  return evaluateExpr(body, cells, visiting);
}

/** Recalculate display values for all formula cells. */
export function recalculateSheet(cells: CellMap): Record<string, number | string> {
  const display: Record<string, number | string> = {};
  for (const [addr, cell] of Object.entries(cells)) {
    if (cell.formula?.startsWith("=")) {
      display[addr] = evaluateFormula(cell.formula, cells);
    } else if (cell.value !== undefined) {
      display[addr] = cell.value;
    }
  }
  return display;
}
