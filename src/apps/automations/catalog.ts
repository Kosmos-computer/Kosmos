export interface RecommendedAutomation {
  id: string;
  name: string;
  category: string;
  description: string;
  prompt: string;
  /** MCP server ids required before launch. */
  requiredMcpServerIds: string[];
  popularityRank?: number;
}

export const AUTOMATION_CATALOG: RecommendedAutomation[] = [
  {
    id: "morning-briefing",
    name: "Morning briefing",
    category: "Productivity",
    description: "Summarize today's calendar, weather, and open tasks every morning.",
    prompt:
      "Create a morning briefing automation that runs every weekday at 9am. Summarize my calendar for today, notable open tasks, and anything urgent from recent chat sessions. Keep it under 200 words.",
    requiredMcpServerIds: [],
    popularityRank: 100,
  },
  {
    id: "dashboard-refresh",
    name: "Dashboard refresh",
    category: "Apps",
    description: "Refresh live dashboard apps with the latest data on a schedule.",
    prompt:
      "Set up a daily automation at 8am that updates my dashboard apps with fresh data. Name each app explicitly and report what changed.",
    requiredMcpServerIds: [],
    popularityRank: 95,
  },
  {
    id: "github-pr-reviewer",
    name: "GitHub PR reviewer",
    category: "GitHub",
    description: "Review new pull requests when they open and post a concise summary.",
    prompt:
      "Create an event-triggered automation for GitHub pull_request.opened events. When a PR opens, read the diff and post a structured review summary (risks, test gaps, suggested follow-ups).",
    requiredMcpServerIds: ["github"],
    popularityRank: 94,
  },
  {
    id: "github-repo-monitor",
    name: "GitHub repo monitor",
    category: "GitHub",
    description: "Daily scan of repository activity and open issues.",
    prompt:
      "Schedule a weekday automation at 5pm that summarizes today's GitHub activity in my active repo: merged PRs, new issues, and stale items needing attention.",
    requiredMcpServerIds: ["github"],
    popularityRank: 92,
  },
  {
    id: "slack-standup-digest",
    name: "Standup digest",
    category: "Messaging",
    description: "Collect standup notes and deliver a digest to a channel.",
    prompt:
      "Create a weekday 9:30am automation that drafts a standup digest from yesterday's activity and prepares it for delivery to my team channel.",
    requiredMcpServerIds: ["slack"],
    popularityRank: 90,
  },
];

export const PROVEN_AUTOMATION_IDS = ["morning-briefing", "dashboard-refresh", "github-pr-reviewer"] as const;

export const CREATE_AUTOMATION_PROMPT =
  "Help me create an automation. Ask what it should do, how often it should run (or which events should trigger it), and whether results should be delivered to a channel.";
