/** GitHub OAuth + repo picker shapes shared between server and client. */

export type GitHubAccountStatus = "connected" | "expired" | "error";

export interface GitHubAccountInfo {
  id: string;
  login: string;
  status: GitHubAccountStatus;
  connectedAt: string;
}

export interface GitHubRepoSummary {
  fullName: string;
  name: string;
  private: boolean;
  cloneUrl: string;
  defaultBranch: string;
}
