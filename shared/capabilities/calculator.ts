/**
 * os.calculator@1 — arithmetic evaluation and history.
 *
 * The OS owns the canonical history store; the Calculator app is a view over
 * that data. Agents reach it through manifest tool contributions bound to
 * these intents.
 */

export const CALCULATOR_CONTRACT_ID = "os.calculator@1";

export interface CalculatorEntry {
  id: string;
  expression: string;
  result: string;
  createdAt: string;
}

export const CALCULATOR_INTENTS = {
  "calculator.evaluate": "write",
  "calculator.history.list": "read",
} as const;

export type CalculatorIntentId = keyof typeof CALCULATOR_INTENTS;

export const CALCULATOR_INTENT_SCHEMAS: Record<CalculatorIntentId, Record<string, unknown>> = {
  "calculator.evaluate": {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description:
          'Math expression with +, -, *, /, %, ^, parentheses, factorial (!), and functions sin/cos/tan/asin/acos/atan/log/ln/sqrt/abs plus constants pi and e. Example: "sin(45) + sqrt(16)"',
      },
      angleMode: {
        type: "string",
        enum: ["DEG", "RAD"],
        description: "Angle mode for trig functions (default DEG)",
      },
    },
    required: ["expression"],
  },
  "calculator.history.list": {
    type: "object",
    properties: {
      limit: { type: "number", description: "Maximum entries to return (default 20)" },
    },
  },
};
