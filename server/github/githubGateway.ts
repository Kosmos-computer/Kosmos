/**
 * GitHub gateway — account status, repo listing, and disconnect.
 */
import type { GitHubAccountInfo, GitHubRepoSummary } from "../../shared/github.js";
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

export async function listGitHubRepos(
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
