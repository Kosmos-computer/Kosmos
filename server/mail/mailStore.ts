/**
 * Mail account persistence — OAuth tokens and IMAP passwords live server-side.
 * API reads are masked; secrets never cross the wire.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  MailAccountInfo,
  MailAccountStatus,
  MailImapEndpoints,
  MailProvider,
} from "../../shared/mail.js";
import { dataDirs } from "../env.js";
import { writeSecureJson } from "../security/secureFs.js";
import { vaultStore } from "../security/vaultStore.js";
import { exchangeGoogleCode, refreshGoogleAccessToken } from "./googleOAuth.js";

function accountsPath(): string {
  return path.join(dataDirs.root, "mail-accounts.json");
}

function passwordVaultId(accountId: string): string {
  return `mail/${accountId}/password`;
}

interface MailAccountRecord {
  id: string;
  userId: string;
  provider: MailProvider;
  email: string;
  /** Google OAuth refresh token — unused for IMAP. */
  refreshToken: string;
  accessToken?: string;
  accessTokenExpiresAt?: string;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  status: MailAccountStatus;
  connectedAt: string;
}

interface MailAccountsFile {
  accounts: MailAccountRecord[];
}

const EMPTY: MailAccountsFile = { accounts: [] };

function load(): MailAccountsFile {
  try {
    return { ...EMPTY, ...(JSON.parse(fs.readFileSync(accountsPath(), "utf-8")) as Partial<MailAccountsFile>) };
  } catch {
    return { ...EMPTY };
  }
}

function save(file: MailAccountsFile): void {
  writeSecureJson(accountsPath(), file);
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

export type MailAccountRecordPublic = MailAccountRecord;

export const mailStore = {
  listForUser(userId: string): MailAccountInfo[] {
    return load()
      .accounts.filter((account) => account.userId === userId)
      .map(toInfo);
  },

  /** First user id that has a connected mail account (headless fallback). */
  anyConnectedUserId(): string | undefined {
    return load().accounts[0]?.userId;
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

  upsertImapAccount(input: {
    userId: string;
    email: string;
    password: string;
    endpoints: MailImapEndpoints;
  }): MailAccountInfo {
    const file = load();
    const now = new Date().toISOString();
    const existing = file.accounts.find(
      (account) =>
        account.userId === input.userId &&
        account.provider === "imap" &&
        account.email.toLowerCase() === input.email.toLowerCase(),
    );
    if (existing) {
      existing.email = input.email;
      existing.imapHost = input.endpoints.imapHost;
      existing.imapPort = input.endpoints.imapPort;
      existing.smtpHost = input.endpoints.smtpHost;
      existing.smtpPort = input.endpoints.smtpPort;
      existing.smtpSecure = input.endpoints.smtpSecure;
      existing.status = "connected";
      vaultStore.put({
        id: passwordVaultId(existing.id),
        name: `Mail password (${input.email})`,
        scope: "oauth",
        plaintext: input.password,
      });
      save(file);
      return toInfo(existing);
    }

    const id = crypto.randomUUID();
    vaultStore.put({
      id: passwordVaultId(id),
      name: `Mail password (${input.email})`,
      scope: "oauth",
      plaintext: input.password,
    });
    const record: MailAccountRecord = {
      id,
      userId: input.userId,
      provider: "imap",
      email: input.email,
      refreshToken: "",
      imapHost: input.endpoints.imapHost,
      imapPort: input.endpoints.imapPort,
      smtpHost: input.endpoints.smtpHost,
      smtpPort: input.endpoints.smtpPort,
      smtpSecure: input.endpoints.smtpSecure,
      status: "connected",
      connectedAt: now,
    };
    file.accounts.push(record);
    save(file);
    return toInfo(record);
  },

  imapAuthFor(account: MailAccountRecord): {
    email: string;
    password: string;
    endpoints: MailImapEndpoints;
  } {
    if (account.provider !== "imap") throw new Error("Not an IMAP account");
    const password = vaultStore.getPlaintext(passwordVaultId(account.id));
    if (!password) throw new Error("Mail password missing — reconnect the account");
    if (!account.imapHost || !account.smtpHost) throw new Error("IMAP endpoints missing");
    return {
      email: account.email,
      password,
      endpoints: {
        imapHost: account.imapHost,
        imapPort: account.imapPort ?? 993,
        smtpHost: account.smtpHost,
        smtpPort: account.smtpPort ?? 465,
        smtpSecure: account.smtpSecure ?? true,
      },
    };
  },

  disconnect(userId: string, accountId: string): boolean {
    const file = load();
    const target = file.accounts.find(
      (account) => account.userId === userId && account.id === accountId,
    );
    if (!target) return false;
    file.accounts = file.accounts.filter((account) => account.id !== accountId);
    save(file);
    vaultStore.delete(passwordVaultId(accountId));
    return true;
  },

  /** Returns a valid access token, refreshing when close to expiry. */
  async accessTokenFor(account: MailAccountRecord): Promise<string> {
    if (account.provider !== "google") {
      throw new Error("Access tokens are only available for Google OAuth accounts");
    }
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
