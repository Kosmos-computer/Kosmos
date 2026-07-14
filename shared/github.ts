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

export interface GitHubIssueDetail {
  number: number;
  title: string;
  body: string | null;
  state: string;
  htmlUrl: string;
  userLogin: string;
  labels: string[];
  repositoryFullName: string;
}
