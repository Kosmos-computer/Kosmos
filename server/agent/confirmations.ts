/**
 * Exec confirmation gate — the Cursor-style safety line between the agent
 * and your real repos. Risky shell commands pause the agent loop mid-turn:
 * the server parks a promise here, the client renders Allow/Deny, and
 * POST /api/confirmations/:id resolves it. No answer within the timeout
 * means deny.
 */
import crypto from "node:crypto";

/**
 * Commands that mutate remote state or destroy work irreversibly. Everything
 * else (builds, tests, local git) runs unprompted — the gate is for actions
 * you can't undo, not friction for the common path.
 */
const RISKY_PATTERNS: RegExp[] = [
  /\bgit\s+push\b/,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+clean\b/,
  /\bgit\s+checkout\s+\./,
  /\bgit\s+restore\b/,
  /\bgit\s+rebase\b/,
  /\bgit\s+branch\s+(-D|-d)\b/,
  /\bgit\s+push\s+.*--force/,
  /\brm\s+(-\w*[rf]\w*\s+)+/,
  /\bnpm\s+publish\b/,
  /\bgh\s+(pr|release|repo)\s+(create|merge|delete)\b/,
];

export function isRiskyCommand(command: string): boolean {
  return RISKY_PATTERNS.some((re) => re.test(command));
}

const TIMEOUT_MS = 120_000;

/**
 * The user's answer. `remember` carries the scope of an extended choice from
 * the policy confirm card: "session" allows this tool for the rest of the
 * chat session, "always" persists a policy rule. Plain exec confirmations
 * ignore it — a risky command is approved per invocation, never blanket.
 */
export interface ConfirmAnswer {
  approved: boolean;
  remember?: "session" | "always";
}

interface PendingConfirmation {
  resolve: (answer: ConfirmAnswer) => void;
  timer: ReturnType<typeof setTimeout>;
  cleanup: () => void;
}

const pending = new Map<string, PendingConfirmation>();

/** Park until the user answers (or the timeout denies). Returns the verdict. */
export function requestConfirmation(signal?: AbortSignal): { confirmId: string; verdict: Promise<ConfirmAnswer> } {
  const confirmId = crypto.randomUUID();
  const verdict = new Promise<ConfirmAnswer>((resolve) => {
    const finish = (answer: ConfirmAnswer) => {
      const entry = pending.get(confirmId);
      if (!entry) return;
      clearTimeout(entry.timer);
      entry.cleanup();
      pending.delete(confirmId);
      resolve(answer);
    };
    const timer = setTimeout(() => {
      finish({ approved: false });
    }, TIMEOUT_MS);
    const onAbort = () => finish({ approved: false });
    signal?.addEventListener("abort", onAbort, { once: true });
    pending.set(confirmId, {
      resolve,
      timer,
      cleanup: () => signal?.removeEventListener("abort", onAbort),
    });
    if (signal?.aborted) finish({ approved: false });
  });
  return { confirmId, verdict };
}

/** Answer a pending confirmation. Returns false for unknown/expired ids. */
export function resolveConfirmation(confirmId: string, answer: ConfirmAnswer): boolean {
  const entry = pending.get(confirmId);
  if (!entry) return false;
  clearTimeout(entry.timer);
  entry.cleanup();
  pending.delete(confirmId);
  entry.resolve(answer);
  return true;
}
