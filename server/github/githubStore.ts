/**
 * GitHub account persistence — OAuth tokens live server-side in
 * data/github-accounts.json. API reads return metadata only.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { GitHubAccountInfo, GitHubAccountStatus } from "../../shared/github.js";
import { dataDirs } from "../env.js";
import { exchangeGitHubCode } from "./githubOAuth.js";

const FILE = path.join(dataDirs.root, "github-accounts.json");

interface GitHubAccountRecord {
  id: string;
  userId: string;
  login: string;
  accessToken: string;
  status: GitHubAccountStatus;
  connectedAt: string;
}

interface GitHubAccountsFile {
  accounts: GitHubAccountRecord[];
}

const EMPTY: GitHubAccountsFile = { accounts: [] };

function load(): GitHubAccountsFile {
  try {
    return { ...EMPTY, ...(JSON.parse(fs.readFileSync(FILE, "utf-8")) as Partial<GitHubAccountsFile>) };
  } catch {
    return { ...EMPTY };
  }
}

function save(file: GitHubAccountsFile): void {
  fs.mkdirSync(dataDirs.root, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(file, null, 2), { encoding: "utf-8", mode: 0o600 });
}

function toInfo(record: GitHubAccountRecord): GitHubAccountInfo {
  return {
    id: record.id,
    login: record.login,
    status: record.status,
    connectedAt: record.connectedAt,
  };
}

export const githubStore = {
  listForUser(userId: string): GitHubAccountInfo[] {
    return load()
      .accounts.filter((account) => account.userId === userId)
      .map(toInfo);
  },

  getForUser(userId: string, accountId?: string): GitHubAccountRecord | undefined {
    const accounts = load().accounts.filter((account) => account.userId === userId);
    if (accountId) return accounts.find((account) => account.id === accountId);
    return accounts[0];
  },

  upsertAccount(input: {
    userId: string;
    login: string;
    accessToken: string;
  }): GitHubAccountInfo {
    const file = load();
    const now = new Date().toISOString();
    const existing = file.accounts.find((account) => account.userId === input.userId);
    if (existing) {
      existing.login = input.login;
      existing.accessToken = input.accessToken;
      existing.status = "connected";
      save(file);
      return toInfo(existing);
    }
    const record: GitHubAccountRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      login: input.login,
      accessToken: input.accessToken,
      status: "connected",
      connectedAt: now,
    };
    file.accounts.push(record);
    save(file);
    return toInfo(record);
  },

  disconnect(userId: string, accountId: string): boolean {
    const file = load();
    const before = file.accounts.length;
    file.accounts = file.accounts.filter(
      (account) => !(account.userId === userId && account.id === accountId),
    );
    if (file.accounts.length === before) return false;
    save(file);
    return true;
  },

  accessTokenFor(userId: string, accountId?: string): string | undefined {
    const account = githubStore.getForUser(userId, accountId);
    if (!account || account.status !== "connected") return undefined;
    return account.accessToken;
  },

  async completeGitHubOAuth(input: { userId: string; code: string }): Promise<GitHubAccountInfo> {
    const tokens = await exchangeGitHubCode(input.code);
    return githubStore.upsertAccount({
      userId: input.userId,
      login: tokens.login,
      accessToken: tokens.accessToken,
    });
  },

  markStatus(accountId: string, status: GitHubAccountStatus): void {
    const file = load();
    const target = file.accounts.find((account) => account.id === accountId);
    if (!target) return;
    target.status = status;
    save(file);
  },
};
