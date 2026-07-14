/**
 * GitHub gateway — account status, repo listing, issue fetch, and disconnect.
 */
import type {
  GitHubAccountInfo,
  GitHubIssueDetail,
  GitHubRepoSummary,
} from "../../shared/github.js";
import { isGitHubOAuthConfigured, resolveGitHubLogin } from "./githubOAuth.js";
import { githubStore } from "./githubStore.js";

async function withAccessToken<T>(
  userId: string,
  accountId: string | undefined,
  run: (accessToken: string) => Promise<T>,
): Promise<T> {
  const account = githubStore.getForUser(userId, accountId);
  if (!account) throw new Error("No GitHub account connected");
  try {
    return await run(account.accessToken);
  } catch (err) {
    githubStore.markStatus(account.id, "error");
    throw err;
  }
}

async function listGitHubRepos(
  accessToken: string,
  query?: string,
): Promise<GitHubRepoSummary[]> {
  const params = new URLSearchParams({
    per_page: "30",
    sort: "updated",
    affiliation: "owner,collaborator,organization_member",
  });
  const res = await fetch(`https://api.github.com/user/repos?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const data = (await res.json()) as
    | Array<{
        full_name?: string;
        name?: string;
        private?: boolean;
        clone_url?: string;
        default_branch?: string;
      }>
    | { message?: string };
  if (!res.ok) {
    const message = Array.isArray(data) ? undefined : data.message;
    throw new Error(message ?? `GitHub API error (${res.status})`);
  }
  const repos = data as Array<{
    full_name?: string;
    name?: string;
    private?: boolean;
    clone_url?: string;
    default_branch?: string;
  }>;
  const q = query?.trim().toLowerCase();
  return repos
    .filter((repo) => repo.full_name && repo.clone_url)
    .filter((repo) => !q || repo.full_name!.toLowerCase().includes(q))
    .map((repo) => ({
      fullName: repo.full_name!,
      name: repo.name ?? repo.full_name!.split("/").pop() ?? "repo",
      private: Boolean(repo.private),
      cloneUrl: repo.clone_url!,
      defaultBranch: repo.default_branch ?? "main",
    }));
}

/** Parse `https://github.com/o/r/issues/1` or `o/r#1` / `o/r/issues/1`. */
export function parseGitHubIssueRef(input: string): { owner: string; repo: string; number: number } {
  const trimmed = input.trim();
  const urlMatch =
    /^https?:\/\/github\.com\/([^/]+)\/([^/#]+)\/(?:issues|pull)\/(\d+)(?:#.*)?$/i.exec(trimmed);
  if (urlMatch) {
    return { owner: urlMatch[1]!, repo: urlMatch[2]!, number: Number(urlMatch[3]) };
  }
  const shortMatch = /^([^/\s]+)\/([^/#\s]+)(?:#|\/issues\/|\/pull\/)(\d+)$/i.exec(trimmed);
  if (shortMatch) {
    return { owner: shortMatch[1]!, repo: shortMatch[2]!, number: Number(shortMatch[3]) };
  }
  throw new Error("Expected a GitHub issue URL or owner/repo#123");
}

async function fetchGitHubIssue(
  accessToken: string,
  owner: string,
  repo: string,
  number: number,
): Promise<GitHubIssueDetail> {
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  const data = (await res.json()) as
    | {
        number?: number;
        title?: string;
        body?: string | null;
        state?: string;
        html_url?: string;
        user?: { login?: string };
        labels?: Array<{ name?: string } | string>;
      }
    | { message?: string };
  if (!res.ok) {
    const message = "message" in data ? data.message : undefined;
    throw new Error(message ?? `GitHub API error (${res.status})`);
  }
  const issue = data as {
    number?: number;
    title?: string;
    body?: string | null;
    state?: string;
    html_url?: string;
    user?: { login?: string };
    labels?: Array<{ name?: string } | string>;
  };
  if (!issue.number || !issue.title || !issue.html_url) {
    throw new Error("Unexpected GitHub issue response");
  }
  return {
    number: issue.number,
    title: issue.title,
    body: issue.body ?? null,
    state: issue.state ?? "open",
    htmlUrl: issue.html_url,
    userLogin: issue.user?.login ?? "unknown",
    labels: (issue.labels ?? [])
      .map((label) => (typeof label === "string" ? label : label.name ?? ""))
      .filter(Boolean),
    repositoryFullName: `${owner}/${repo}`,
  };
}

export const githubGateway = {
  oauthConfigured(): boolean {
    return isGitHubOAuthConfigured();
  },

  listAccounts(userId: string): GitHubAccountInfo[] {
    return githubStore.listForUser(userId);
  },

  disconnect(userId: string, accountId: string): boolean {
    return githubStore.disconnect(userId, accountId);
  },

  listRepos(userId: string, query?: string, accountId?: string): Promise<GitHubRepoSummary[]> {
    return withAccessToken(userId, accountId, (token) => listGitHubRepos(token, query));
  },

  fetchIssue(userId: string, ref: string, accountId?: string): Promise<GitHubIssueDetail> {
    const { owner, repo, number } = parseGitHubIssueRef(ref);
    return withAccessToken(userId, accountId, (token) =>
      fetchGitHubIssue(token, owner, repo, number),
    );
  },

  accessTokenFor(userId: string, accountId?: string): string | undefined {
    return githubStore.accessTokenFor(userId, accountId);
  },

  async connectWithPat(userId: string, token: string): Promise<GitHubAccountInfo> {
    const trimmed = token.trim();
    if (!trimmed) throw new Error("Personal access token is required");
    const login = await resolveGitHubLogin(trimmed);
    return githubStore.upsertAccount({
      userId,
      login,
      accessToken: trimmed,
    });
  },
};
