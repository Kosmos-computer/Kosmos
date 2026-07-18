/**
 * Diff review comments — line notes on Studio diffs that can be sent back
 * to the agent (Orca-style annotate AI diffs).
 */
export interface DiffComment {
  id: string;
  filePath: string;
  /** 1-based line on the modified side; 0 = file-scope. */
  lineNumber: number;
  body: string;
  createdAt: number;
  sentAt?: number;
}

export function formatDiffComment(c: DiffComment): string {
  const escaped = c.body
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
  const locationLabel = c.lineNumber === 0 ? "Scope: file" : `Line: ${c.lineNumber}`;
  return [`File: ${c.filePath}`, locationLabel, `User comment: "${escaped}"`].join("\n");
}

export function formatDiffComments(comments: readonly DiffComment[]): string {
  if (comments.length === 0) return "";
  return [
    "## Diff review notes",
    "",
    "Please address the following review comments on your recent changes:",
    "",
    ...comments.map(formatDiffComment),
  ].join("\n");
}
