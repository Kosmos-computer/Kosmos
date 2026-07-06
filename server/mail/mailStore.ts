/**
 * Mail account persistence — OAuth refresh tokens and account metadata live
 * server-side in data/mail-accounts.json. Mirrors channelStore's secret-handling:
 * API reads are masked; tokens never cross the wire.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { MailAccountInfo, MailAccountStatus, MailProvider } from "../../shared/mail.js";
import { dataDirs } from "../env.js";
import { exchangeGoogleCode, refreshGoogleAccessToken } from "./googleOAuth.js";

const FILE = path.join(dataDirs.root, "mail-accounts.json");

interface MailAccountRecord {
  id: string;
  userId: string;
  provider: MailProvider;
  email: string;
  refreshToken: string;
  accessToken?: string;
  accessTokenExpiresAt?: string;
  status: MailAccountStatus;
  connectedAt: string;
}

interface MailAccountsFile {
  accounts: MailAccountRecord[];
}

const EMPTY: MailAccountsFile = { accounts: [] };

function load(): MailAccountsFile {
  try {
    return { ...EMPTY, ...(JSON.parse(fs.readFileSync(FILE, "utf-8")) as Partial<MailAccountsFile>) };
  } catch {
    return { ...EMPTY };
  }
}

function save(file: MailAccountsFile): void {
  fs.mkdirSync(dataDirs.root, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(file, null, 2), { encoding: "utf-8", mode: 0o600 });
}

function toInfo(record: MailAccountRecord): MailAccountInfo {
  return {
    id: record.id,
    provider: record.provider,
    email: record.email,
    status: record.status,
    connectedAt: record.connectedAt,
  };
}

export const mailStore = {
  listForUser(userId: string): MailAccountInfo[] {
    return load()
      .accounts.filter((account) => account.userId === userId)
      .map(toInfo);
  },

  getForUser(userId: string, accountId?: string): MailAccountRecord | undefined {
    const accounts = load().accounts.filter((account) => account.userId === userId);
    if (accountId) return accounts.find((account) => account.id === accountId);
    return accounts[0];
  },

  upsertGoogleAccount(input: {
    userId: string;
    email: string;
    refreshToken: string;
    accessToken: string;
    expiresIn: number;
  }): MailAccountInfo {
    const file = load();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + input.expiresIn * 1000).toISOString();
    const existing = file.accounts.find(
      (account) => account.userId === input.userId && account.provider === "google",
    );
    if (existing) {
      existing.email = input.email;
      existing.refreshToken = input.refreshToken;
      existing.accessToken = input.accessToken;
      existing.accessTokenExpiresAt = expiresAt;
      existing.status = "connected";
      save(file);
      return toInfo(existing);
    }
    const record: MailAccountRecord = {
      id: crypto.randomUUID(),
      userId: input.userId,
      provider: "google",
      email: input.email,
      refreshToken: input.refreshToken,
      accessToken: input.accessToken,
      accessTokenExpiresAt: expiresAt,
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

  /** Returns a valid access token, refreshing when close to expiry. */
  async accessTokenFor(account: MailAccountRecord): Promise<string> {
    const expiresAt = account.accessTokenExpiresAt
      ? Date.parse(account.accessTokenExpiresAt)
      : 0;
    if (account.accessToken && expiresAt - Date.now() > 60_000) {
      return account.accessToken;
    }
    const refreshed = await refreshGoogleAccessToken(account.refreshToken);
    const file = load();
    const target = file.accounts.find((entry) => entry.id === account.id);
    if (!target) throw new Error("Mail account not found");
    target.accessToken = refreshed.accessToken;
    target.accessTokenExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000).toISOString();
    target.status = "connected";
    save(file);
    return refreshed.accessToken;
  },

  async completeGoogleOAuth(input: {
    userId: string;
    code: string;
  }): Promise<MailAccountInfo> {
    const tokens = await exchangeGoogleCode(input.code);
    return mailStore.upsertGoogleAccount({
      userId: input.userId,
      email: tokens.email,
      refreshToken: tokens.refreshToken,
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    });
  },

  markStatus(accountId: string, status: MailAccountStatus): void {
    const file = load();
    const target = file.accounts.find((account) => account.id === accountId);
    if (!target) return;
    target.status = status;
    save(file);
  },
};
