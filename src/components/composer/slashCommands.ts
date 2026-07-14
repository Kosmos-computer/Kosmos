/**
 * Slash command registry for the chat/studio composer. Selecting a command
 * replaces the trailing `/query` token with `insert` text (or runs `run`).
 */
export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  /** Text inserted into the composer (replaces the `/…` token). */
  insert: string;
  keywords?: string[];
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "fix",
    label: "fix",
    description: "Ask the agent to fix a bug or failing test",
    insert: "Fix: ",
    keywords: ["bug", "error"],
  },
  {
    id: "explain",
    label: "explain",
    description: "Explain how something in the workspace works",
    insert: "Explain: ",
    keywords: ["how", "why"],
  },
  {
    id: "test",
    label: "test",
    description: "Write or run tests for the current change",
    insert: "Write tests for: ",
    keywords: ["coverage", "spec"],
  },
  {
    id: "review",
    label: "review",
    description: "Review the current diff for risks and regressions",
    insert: "Review the current changes and call out risks: ",
    keywords: ["diff", "pr"],
  },
  {
    id: "commit",
    label: "commit",
    description: "Draft a commit message for staged changes",
    insert: "Draft a concise commit message for the current changes.",
    keywords: ["git", "message"],
  },
  {
    id: "plan",
    label: "plan",
    description: "Produce an implementation plan before coding",
    insert: "Plan how to: ",
    keywords: ["steps", "design"],
  },
];

/** Match the trailing `/token` in the draft (token may be empty). */
export function matchSlashToken(value: string): { start: number; query: string } | null {
  const match = /(^|\s)\/([^\s]*)$/.exec(value);
  if (!match) return null;
  const query = match[2] ?? "";
  const start = value.length - query.length - 1;
  return { start, query };
}

export function filterSlashCommands(query: string): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((cmd) => {
    const haystack = [cmd.label, cmd.description, ...(cmd.keywords ?? [])].join(" ").toLowerCase();
    return haystack.includes(q) || cmd.label.startsWith(q);
  });
}

export function applySlashCommand(value: string, command: SlashCommand): string {
  const token = matchSlashToken(value);
  if (!token) return `${value}${command.insert}`;
  return `${value.slice(0, token.start)}${command.insert}`;
}
