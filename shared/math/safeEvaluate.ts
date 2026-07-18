/**
 * Safe arithmetic / scientific expression evaluator — no eval/Function.
 *
 * Tokenizer + shunting-yard, following the pattern used by common open-source
 * scientific calculators (expression buffer → tokens → RPN apply).
 */

export type AngleMode = "DEG" | "RAD";

export interface EvaluateOptions {
  angleMode?: AngleMode;
}

type Token =
  | { type: "number"; value: number }
  | { type: "function"; value: string }
  | { type: "operator"; value: string };

const PRECEDENCE: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "%": 2,
  "^": 3,
};

const RIGHT_ASSOC: Record<string, boolean> = { "^": true };

const FUNCTIONS = new Set([
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "log",
  "ln",
  "sqrt",
  "abs",
]);

function factorial(n: number): number {
  if (n < 0) throw new Error("Factorial of negative");
  if (!Number.isInteger(n)) throw new Error("Factorial of non-integer");
  if (n > 170) return Number.POSITIVE_INFINITY;
  let result = 1;
  for (let i = 2; i <= n; i += 1) result *= i;
  return result;
}

function toRadians(value: number, mode: AngleMode): number {
  return mode === "DEG" ? (value * Math.PI) / 180 : value;
}

function fromRadians(value: number, mode: AngleMode): number {
  return mode === "DEG" ? (value * 180) / Math.PI : value;
}

function applyFunction(name: string, value: number, mode: AngleMode): number {
  switch (name) {
    case "sin":
      return Math.sin(toRadians(value, mode));
    case "cos":
      return Math.cos(toRadians(value, mode));
    case "tan":
      return Math.tan(toRadians(value, mode));
    case "asin":
      return fromRadians(Math.asin(value), mode);
    case "acos":
      return fromRadians(Math.acos(value), mode);
    case "atan":
      return fromRadians(Math.atan(value), mode);
    case "log":
      return Math.log10(value);
    case "ln":
      return Math.log(value);
    case "sqrt":
      if (value < 0) throw new Error("Square root of negative");
      return Math.sqrt(value);
    case "abs":
      return Math.abs(value);
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i]!;

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (/\d/.test(ch) || (ch === "." && i + 1 < expr.length && /\d/.test(expr[i + 1]!))) {
      let num = "";
      while (i < expr.length && (/[\d.]/.test(expr[i]!) || /[eE]/.test(expr[i]!))) {
        if (/[eE]/.test(expr[i]!)) {
          num += expr[i++]!;
          if (i < expr.length && /[+-]/.test(expr[i]!)) num += expr[i++]!;
          continue;
        }
        num += expr[i++]!;
      }
      const value = Number.parseFloat(num);
      if (!Number.isFinite(value)) throw new Error("Invalid number");
      tokens.push({ type: "number", value });
      continue;
    }

    if (/[a-z]/i.test(ch)) {
      let name = "";
      while (i < expr.length && /[a-z]/i.test(expr[i]!)) name += expr[i++]!;
      const lower = name.toLowerCase();
      if (lower === "pi") {
        tokens.push({ type: "number", value: Math.PI });
      } else if (lower === "e") {
        tokens.push({ type: "number", value: Math.E });
      } else if (FUNCTIONS.has(lower)) {
        tokens.push({ type: "function", value: lower });
      } else {
        throw new Error(`Unknown identifier: ${name}`);
      }
      continue;
    }

    if ("+-*/%^()!".includes(ch)) {
      tokens.push({ type: "operator", value: ch });
      i += 1;
      continue;
    }

    throw new Error(`Unsupported character: ${ch}`);
  }
  return tokens;
}

function preprocess(expr: string): string {
  return expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/(\d|\))\s*\(/g, "$1*(")
    .replace(/\)\s*(\d|[a-z])/gi, ")*$1")
    .replace(/(\d)\s*([a-z])/gi, "$1*$2")
    .replace(/π/g, "pi");
}

/** Evaluate a math expression. Throws on invalid input. */
export function safeEvaluate(expression: string, options: EvaluateOptions = {}): number {
  const mode = options.angleMode ?? "DEG";
  const src = preprocess(expression).trim();
  if (!src) throw new Error("Expression is empty");

  const tokens = tokenize(src);
  if (tokens.length === 0) throw new Error("Expression is empty");

  const output: number[] = [];
  const ops: Token[] = [];

  function applyOp(op: Token): void {
    if (op.type === "function") {
      const a = output.pop();
      if (a === undefined) throw new Error("Invalid expression");
      output.push(applyFunction(op.value, a, mode));
      return;
    }
    if (op.value === "!") {
      const a = output.pop();
      if (a === undefined) throw new Error("Invalid expression");
      output.push(factorial(a));
      return;
    }
    const b = output.pop();
    const a = output.pop();
    if (a === undefined || b === undefined) throw new Error("Invalid expression");
    switch (op.value) {
      case "+":
        output.push(a + b);
        break;
      case "-":
        output.push(a - b);
        break;
      case "*":
        output.push(a * b);
        break;
      case "/":
        if (b === 0) throw new Error("Division by zero");
        output.push(a / b);
        break;
      case "%":
        output.push(a % b);
        break;
      case "^":
        output.push(Math.pow(a, b));
        break;
      default:
        throw new Error(`Unknown operator: ${op.value}`);
    }
  }

  let prev: Token | null = null;
  for (const token of tokens) {
    if (token.type === "number") {
      output.push(token.value);
    } else if (token.type === "function") {
      ops.push(token);
    } else if (token.value === "(") {
      ops.push(token);
    } else if (token.value === ")") {
      while (ops.length && ops[ops.length - 1]!.value !== "(") {
        applyOp(ops.pop()!);
      }
      if (!ops.length || ops[ops.length - 1]!.value !== "(") {
        throw new Error("Mismatched parentheses");
      }
      ops.pop();
      if (ops.length && ops[ops.length - 1]!.type === "function") {
        applyOp(ops.pop()!);
      }
    } else if (token.value === "!") {
      const a = output.pop();
      if (a === undefined) throw new Error("Invalid expression");
      output.push(factorial(a));
    } else {
      const isUnaryMinus =
        token.value === "-" &&
        (prev === null ||
          (prev.type === "operator" && prev.value !== ")" && prev.value !== "!"));
      if (isUnaryMinus) output.push(0);

      const prec = PRECEDENCE[token.value] ?? 0;
      while (ops.length) {
        const top = ops[ops.length - 1]!;
        if (top.value === "(" || top.type === "function") break;
        const topPrec = PRECEDENCE[top.value] ?? 0;
        if (topPrec > prec || (topPrec === prec && !RIGHT_ASSOC[token.value])) {
          applyOp(ops.pop()!);
        } else {
          break;
        }
      }
      ops.push(token);
    }
    prev = token;
  }

  while (ops.length) {
    const op = ops.pop()!;
    if (op.value === "(" || op.value === ")") throw new Error("Mismatched parentheses");
    applyOp(op);
  }

  if (output.length !== 1 || !Number.isFinite(output[0]!)) {
    if (output.length === 1 && !Number.isFinite(output[0]!)) return output[0]!;
    throw new Error("Invalid expression");
  }
  return output[0]!;
}

export function formatCalcResult(value: number, maxLength = 12): string {
  if (!Number.isFinite(value)) return "Error";
  const rounded = Math.round(value * 1e12) / 1e12;
  const text = String(rounded);
  if (text.length <= maxLength) return text;
  return Number(rounded.toPrecision(maxLength - 2)).toString();
}
