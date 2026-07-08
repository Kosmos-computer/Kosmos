import { I18nKey } from "../../i18n/declaration";

export interface RecommendedAutomation {
  id: string;
  nameKey: I18nKey;
  categoryKey: I18nKey;
  descriptionKey: I18nKey;
  /** Agent prompt — kept in English for reliable tool use; UI strings are localized separately. */
  prompt: string;
  /** MCP server ids required before launch. */
  requiredMcpServerIds: string[];
  popularityRank?: number;
}

export const AUTOMATION_CATALOG: RecommendedAutomation[] = [
  {
    id: "morning-briefing",
    nameKey: I18nKey.APPS$AUTOMATIONS_CATALOG_MORNING_BRIEFING_NAME,
    categoryKey: I18nKey.APPS$AUTOMATIONS_CATALOG_CATEGORY_PRODUCTIVITY,
    descriptionKey: I18nKey.APPS$AUTOMATIONS_CATALOG_MORNING_BRIEFING_DESC,
    prompt:
      "Create a morning briefing automation that runs every weekday at 9am. Summarize my calendar for today, notable open tasks, and anything urgent from recent chat sessions. Keep it under 200 words.",
    requiredMcpServerIds: [],
    popularityRank: 100,
  },
  {
    id: "dashboard-refresh",
    nameKey: I18nKey.APPS$AUTOMATIONS_CATALOG_DASHBOARD_REFRESH_NAME,
    categoryKey: I18nKey.APPS$AUTOMATIONS_CATALOG_CATEGORY_APPS,
    descriptionKey: I18nKey.APPS$AUTOMATIONS_CATALOG_DASHBOARD_REFRESH_DESC,
    prompt:
      "Set up a daily automation at 8am that updates my dashboard apps with fresh data. Name each app explicitly and report what changed.",
    requiredMcpServerIds: [],
    popularityRank: 95,
  },
  {
    id: "github-pr-reviewer",
    nameKey: I18nKey.APPS$AUTOMATIONS_CATALOG_GITHUB_PR_REVIEWER_NAME,
    categoryKey: I18nKey.APPS$AUTOMATIONS_CATALOG_CATEGORY_GITHUB,
    descriptionKey: I18nKey.APPS$AUTOMATIONS_CATALOG_GITHUB_PR_REVIEWER_DESC,
    prompt:
      "Create an event-triggered automation for GitHub pull_request.opened events. When a PR opens, read the diff and post a structured review summary (risks, test gaps, suggested follow-ups).",
    requiredMcpServerIds: ["github"],
    popularityRank: 94,
  },
  {
    id: "github-repo-monitor",
    nameKey: I18nKey.APPS$AUTOMATIONS_CATALOG_GITHUB_REPO_MONITOR_NAME,
    categoryKey: I18nKey.APPS$AUTOMATIONS_CATALOG_CATEGORY_GITHUB,
    descriptionKey: I18nKey.APPS$AUTOMATIONS_CATALOG_GITHUB_REPO_MONITOR_DESC,
    prompt:
      "Schedule a weekday automation at 5pm that summarizes today's GitHub activity in my active repo: merged PRs, new issues, and stale items needing attention.",
    requiredMcpServerIds: ["github"],
    popularityRank: 92,
  },
  {
    id: "slack-standup-digest",
    nameKey: I18nKey.APPS$AUTOMATIONS_CATALOG_STANDUP_DIGEST_NAME,
    categoryKey: I18nKey.APPS$AUTOMATIONS_CATALOG_CATEGORY_MESSAGING,
    descriptionKey: I18nKey.APPS$AUTOMATIONS_CATALOG_STANDUP_DIGEST_DESC,
    prompt:
      "Create a weekday 9:30am automation that drafts a standup digest from yesterday's activity and prepares it for delivery to my team channel.",
    requiredMcpServerIds: ["slack"],
    popularityRank: 90,
  },
];

export const PROVEN_AUTOMATION_IDS = ["morning-briefing", "dashboard-refresh", "github-pr-reviewer"] as const;

export const CREATE_AUTOMATION_PROMPT =
  "Help me create an automation. Ask what it should do, how often it should run (or which events should trigger it), and whether results should be delivered to a channel.";
