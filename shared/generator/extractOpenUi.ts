/**
 * Pull the first complete openui-lang program out of an LLM reply.
 * Accepts fenced ```openui-lang blocks or raw statement assignments.
 */
const FENCE_RE = /```openui-lang[ \t]*\n([\s\S]*?)```/i;

export function extractOpenUiCode(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fenced = FENCE_RE.exec(trimmed);
  if (fenced?.[1]?.trim()) return fenced[1].trim();

  const lines = trimmed.split("\n").filter((line) => /^\s*\w+\s*=/.test(line));
  if (lines.length > 0) return lines.join("\n").trim();

  return null;
}

export function titleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "Generated UI";
  return trimmed
    .split(/\s+/)
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
