/**
 * GitHub read tools for the OS chat.
 *
 * The token is the account the user already connected in Settings, or
 * GITHUB_TOKEN / GH_TOKEN on the server. These tools list and read. They
 * do not open, merge, or push.
 */
import { githubGateway } from "../github/githubGateway.js";
import type { AgentTool, ToolContext } from "./tools.js";

function tokenFor(ctx: ToolContext): string | undefined {
  return githubGateway.tokenFor(ctx.userId);
}

function repoOf(args: Record<string, unknown>): { owner: string; repo: string } | { error: string } {
  const raw = String(args.repo ?? process.env.KOSMOS_GITHUB_REPO ?? "").trim();
  const [owner, repo] = raw.split("/");
  if (!owner || !repo) {
    return { error: "Pass repo as owner/name, or set KOSMOS_GITHUB_REPO." };
  }
  return { owner, repo };
}

export const githubAgentTools: AgentTool[] = [
  {
    name: "github_status",
    description:
      "Whether the chat can read GitHub (a connected account or GITHUB_TOKEN). Does not reveal the token.",
    parameters: { type: "object", properties: {} },
    execute: async (_args, ctx) => ({ connected: Boolean(tokenFor(ctx)) }),
  },
  {
    name: "github_list_repos",
    description: "List GitHub repositories the connected account can see (up to 30, recently updated).",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Optional name filter" } },
    },
    execute: async (args, ctx) => {
      const token = tokenFor(ctx);
      if (!token) return { error: "GitHub is not connected. Add an account in Settings, or set GITHUB_TOKEN." };
      const query = typeof args.query === "string" ? args.query : undefined;
      return githubGateway.listReposWithToken(token, query);
    },
  },
  {
    name: "github_list_pulls",
    description: "List open pull requests for one repo. Read only.",
    parameters: {
      type: "object",
      properties: {
        repo: { type: "string", description: "owner/name. Defaults to KOSMOS_GITHUB_REPO." },
      },
    },
    execute: async (args, ctx) => {
      const token = tokenFor(ctx);
      if (!token) return { error: "GitHub is not connected. Add an account in Settings, or set GITHUB_TOKEN." };
      const repo = repoOf(args);
      if ("error" in repo) return repo;
      return githubGateway.listPullsWithToken(token, repo.owner, repo.repo);
    },
  },
  {
    name: "github_get_issue",
    description: "Read one GitHub issue or pull request by URL or owner/name#number.",
    parameters: {
      type: "object",
      properties: {
        ref: { type: "string", description: "https://github.com/o/r/issues/1 or o/r#1" },
      },
      required: ["ref"],
    },
    execute: async (args, ctx) => {
      const token = tokenFor(ctx);
      if (!token) return { error: "GitHub is not connected. Add an account in Settings, or set GITHUB_TOKEN." };
      return githubGateway.fetchIssueWithToken(token, String(args.ref ?? ""));
    },
  },
];
