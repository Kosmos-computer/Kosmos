/**
 * Social account persistence — Bluesky/Mastodon/Nostr/X/Facebook secrets live in the vault;
 * metadata only in data/social-accounts.json.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  SocialAccountInfo,
  SocialAccountStatus,
  SocialProvider,
} from "../../shared/social.js";
import { dataDirs } from "../env.js";
import { writeSecureJson } from "../security/secureFs.js";
import { vaultStore } from "../security/vaultStore.js";

const DEFAULT_SERVICE = "https://bsky.social";

function accountsPath(): string {
  return path.join(dataDirs.root, "social-accounts.json");
}

function appPasswordVaultId(accountId: string): string {
  return `social/${accountId}/app-password`;
}

function sessionVaultId(accountId: string): string {
  return `social/${accountId}/session`;
}

function accessTokenVaultId(accountId: string): string {
  return `social/${accountId}/access-token`;
}

function nsecVaultId(accountId: string): string {
  return `social/${accountId}/nsec`;
}

export interface BlueskySessionTokens {
  accessJwt: string;
  refreshJwt: string;
  did: string;
  handle: string;
  active?: boolean;
}

interface SocialAccountRecord {
  id: string;
  userId: string;
  provider: SocialProvider;
  handle: string;
  did: string;
  service: string;
  status: SocialAccountStatus;
  connectedAt: string;
  displayName?: string;
  avatar?: string;
}

interface SocialAccountsFile {
  accounts: SocialAccountRecord[];
}

const EMPTY: SocialAccountsFile = { accounts: [] };

function load(): SocialAccountsFile {
  try {
    return { ...EMPTY, ...(JSON.parse(fs.readFileSync(accountsPath(), "utf-8")) as Partial<SocialAccountsFile>) };
  } catch {
    return { ...EMPTY };
  }
}

function save(file: SocialAccountsFile): void {
  writeSecureJson(accountsPath(), file);
}

function toInfo(record: SocialAccountRecord): SocialAccountInfo {
  const bitsocial =
    record.provider === "bitsocial" ? decodeBitsocialServiceSafe(record.service) : null;
  return {
    id: record.id,
    provider: record.provider,
    handle: record.handle,
    did: record.did,
    status: record.status,
    connectedAt: record.connectedAt,
    instanceUrl: record.provider === "mastodon" ? record.service : undefined,
    pageId: record.provider === "facebook" ? record.did : undefined,
    defaultSubreddit:
      record.provider === "reddit" && record.service ? record.service : undefined,
    rpcUrl: bitsocial?.rpcUrl,
    displayName: record.displayName,
    avatar: record.avatar,
  };
}

function decodeBitsocialServiceSafe(service: string): { rpcUrl: string } | null {
  try {
    const parsed = JSON.parse(service) as { rpcUrl?: string };
    if (parsed?.rpcUrl) return { rpcUrl: parsed.rpcUrl };
  } catch {
    if (service.startsWith("ws://") || service.startsWith("wss://")) {
      return { rpcUrl: service };
    }
  }
  return null;
}

function encodeRelays(relays: string[]): string {
  return JSON.stringify(relays);
}

export function decodeRelays(service: string): string[] {
  try {
    const parsed = JSON.parse(service) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    /* fall through — comma-separated legacy */
  }
  return service
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export type SocialAccountRecordPublic = SocialAccountRecord;

export const socialStore = {
  listForUser(userId: string): SocialAccountInfo[] {
    return load()
      .accounts.filter((account) => account.userId === userId)
      .map(toInfo);
  },

  getForUser(userId: string, accountId?: string): SocialAccountRecord | undefined {
    const accounts = load().accounts.filter((account) => account.userId === userId);
    if (accountId) return accounts.find((account) => account.id === accountId);
    return accounts.find((account) => account.provider === "bluesky") ?? accounts[0];
  },

  upsertBlueskyAccount(input: {
    userId: string;
    handle: string;
    did: string;
    service?: string;
    appPassword: string;
    session: BlueskySessionTokens;
    displayName?: string;
    avatar?: string;
  }): SocialAccountInfo {
    const file = load();
    const now = new Date().toISOString();
    const service = (input.service?.trim() || DEFAULT_SERVICE).replace(/\/$/, "");
    const existing = file.accounts.find(
      (account) =>
        account.userId === input.userId &&
        account.provider === "bluesky" &&
        account.did === input.did,
    );

    const writeSecrets = (accountId: string) => {
      vaultStore.put({
        id: appPasswordVaultId(accountId),
        name: `Bluesky app password (${input.handle})`,
        scope: "oauth",
        plaintext: input.appPassword,
      });
      vaultStore.put({
        id: sessionVaultId(accountId),
        name: `Bluesky session (${input.handle})`,
        scope: "oauth",
        plaintext: JSON.stringify(input.session),
      });
    };

    if (existing) {
      existing.handle = input.handle;
      existing.did = input.did;
      existing.service = service;
      existing.status = "connected";
      if (input.displayName !== undefined) existing.displayName = input.displayName;
      if (input.avatar !== undefined) existing.avatar = input.avatar;
      writeSecrets(existing.id);
      save(file);
      return toInfo(existing);
    }

    const id = crypto.randomUUID();
    writeSecrets(id);
    const record: SocialAccountRecord = {
      id,
      userId: input.userId,
      provider: "bluesky",
      handle: input.handle,
      did: input.did,
      service,
      status: "connected",
      connectedAt: now,
      displayName: input.displayName,
      avatar: input.avatar,
    };
    file.accounts.push(record);
    save(file);
    return toInfo(record);
  },

  upsertMastodonAccount(input: {
    userId: string;
    handle: string;
    accountId: string;
    instanceUrl: string;
    accessToken: string;
    displayName?: string;
    avatar?: string;
  }): SocialAccountInfo {
    const file = load();
    const now = new Date().toISOString();
    const service = input.instanceUrl.replace(/\/$/, "");
    const existing = file.accounts.find(
      (account) =>
        account.userId === input.userId &&
        account.provider === "mastodon" &&
        account.did === input.accountId &&
        account.service === service,
    );

    const writeSecrets = (id: string) => {
      vaultStore.put({
        id: accessTokenVaultId(id),
        name: `Mastodon access token (${input.handle})`,
        scope: "oauth",
        plaintext: input.accessToken,
      });
    };

    if (existing) {
      existing.handle = input.handle;
      existing.did = input.accountId;
      existing.service = service;
      existing.status = "connected";
      if (input.displayName !== undefined) existing.displayName = input.displayName;
      if (input.avatar !== undefined) existing.avatar = input.avatar;
      writeSecrets(existing.id);
      save(file);
      return toInfo(existing);
    }

    const id = crypto.randomUUID();
    writeSecrets(id);
    const record: SocialAccountRecord = {
      id,
      userId: input.userId,
      provider: "mastodon",
      handle: input.handle,
      did: input.accountId,
      service,
      status: "connected",
      connectedAt: now,
      displayName: input.displayName,
      avatar: input.avatar,
    };
    file.accounts.push(record);
    save(file);
    return toInfo(record);
  },

  upsertNostrAccount(input: {
    userId: string;
    npub: string;
    pubkey: string;
    relays: string[];
    nsec: string;
    displayName?: string;
    avatar?: string;
  }): SocialAccountInfo {
    const file = load();
    const now = new Date().toISOString();
    const service = encodeRelays(input.relays);
    const existing = file.accounts.find(
      (account) =>
        account.userId === input.userId &&
        account.provider === "nostr" &&
        account.did === input.pubkey,
    );

    const writeSecrets = (id: string) => {
      vaultStore.put({
        id: nsecVaultId(id),
        name: `Nostr nsec (${input.npub})`,
        scope: "oauth",
        plaintext: input.nsec,
      });
    };

    if (existing) {
      existing.handle = input.npub;
      existing.did = input.pubkey;
      existing.service = service;
      existing.status = "connected";
      if (input.displayName !== undefined) existing.displayName = input.displayName;
      if (input.avatar !== undefined) existing.avatar = input.avatar;
      writeSecrets(existing.id);
      save(file);
      return toInfo(existing);
    }

    const id = crypto.randomUUID();
    writeSecrets(id);
    const record: SocialAccountRecord = {
      id,
      userId: input.userId,
      provider: "nostr",
      handle: input.npub,
      did: input.pubkey,
      service,
      status: "connected",
      connectedAt: now,
      displayName: input.displayName,
      avatar: input.avatar,
    };
    file.accounts.push(record);
    save(file);
    return toInfo(record);
  },

  upsertTwitterAccount(input: {
    userId: string;
    handle: string;
    userIdOnNetwork: string;
    accessToken: string;
    displayName?: string;
    avatar?: string;
  }): SocialAccountInfo {
    const file = load();
    const now = new Date().toISOString();
    const service = "https://api.x.com/2";
    const existing = file.accounts.find(
      (account) =>
        account.userId === input.userId &&
        account.provider === "twitter" &&
        account.did === input.userIdOnNetwork,
    );

    const writeSecrets = (id: string) => {
      vaultStore.put({
        id: accessTokenVaultId(id),
        name: `X/Twitter access token (${input.handle})`,
        scope: "oauth",
        plaintext: input.accessToken,
      });
    };

    if (existing) {
      existing.handle = input.handle;
      existing.did = input.userIdOnNetwork;
      existing.service = service;
      existing.status = "connected";
      if (input.displayName !== undefined) existing.displayName = input.displayName;
      if (input.avatar !== undefined) existing.avatar = input.avatar;
      writeSecrets(existing.id);
      save(file);
      return toInfo(existing);
    }

    const id = crypto.randomUUID();
    writeSecrets(id);
    const record: SocialAccountRecord = {
      id,
      userId: input.userId,
      provider: "twitter",
      handle: input.handle,
      did: input.userIdOnNetwork,
      service,
      status: "connected",
      connectedAt: now,
      displayName: input.displayName,
      avatar: input.avatar,
    };
    file.accounts.push(record);
    save(file);
    return toInfo(record);
  },

  upsertFacebookAccount(input: {
    userId: string;
    handle: string;
    actorId: string;
    accessToken: string;
    isPage: boolean;
    displayName?: string;
    avatar?: string;
  }): SocialAccountInfo {
    const file = load();
    const now = new Date().toISOString();
    const service = input.isPage ? "page" : "user";
    const existing = file.accounts.find(
      (account) =>
        account.userId === input.userId &&
        account.provider === "facebook" &&
        account.did === input.actorId,
    );

    const writeSecrets = (id: string) => {
      vaultStore.put({
        id: accessTokenVaultId(id),
        name: `Facebook access token (${input.handle})`,
        scope: "oauth",
        plaintext: input.accessToken,
      });
    };

    if (existing) {
      existing.handle = input.handle;
      existing.did = input.actorId;
      existing.service = service;
      existing.status = "connected";
      if (input.displayName !== undefined) existing.displayName = input.displayName;
      if (input.avatar !== undefined) existing.avatar = input.avatar;
      writeSecrets(existing.id);
      save(file);
      return toInfo(existing);
    }

    const id = crypto.randomUUID();
    writeSecrets(id);
    const record: SocialAccountRecord = {
      id,
      userId: input.userId,
      provider: "facebook",
      handle: input.handle,
      did: input.actorId,
      service,
      status: "connected",
      connectedAt: now,
      displayName: input.displayName,
      avatar: input.avatar,
    };
    file.accounts.push(record);
    save(file);
    return toInfo(record);
  },

  upsertRedditAccount(input: {
    userId: string;
    handle: string;
    redditId: string;
    accessToken: string;
    defaultSubreddit?: string;
    displayName?: string;
    avatar?: string;
  }): SocialAccountInfo {
    const file = load();
    const now = new Date().toISOString();
    const service = input.defaultSubreddit?.trim() || "";
    const existing = file.accounts.find(
      (account) =>
        account.userId === input.userId &&
        account.provider === "reddit" &&
        account.did === input.redditId,
    );

    const writeSecrets = (id: string) => {
      vaultStore.put({
        id: accessTokenVaultId(id),
        name: `Reddit access token (${input.handle})`,
        scope: "oauth",
        plaintext: input.accessToken,
      });
    };

    if (existing) {
      existing.handle = input.handle;
      existing.did = input.redditId;
      existing.service = service;
      existing.status = "connected";
      if (input.displayName !== undefined) existing.displayName = input.displayName;
      if (input.avatar !== undefined) existing.avatar = input.avatar;
      writeSecrets(existing.id);
      save(file);
      return toInfo(existing);
    }

    const id = crypto.randomUUID();
    writeSecrets(id);
    const record: SocialAccountRecord = {
      id,
      userId: input.userId,
      provider: "reddit",
      handle: input.handle,
      did: input.redditId,
      service,
      status: "connected",
      connectedAt: now,
      displayName: input.displayName,
      avatar: input.avatar,
    };
    file.accounts.push(record);
    save(file);
    return toInfo(record);
  },

  upsertBitsocialAccount(input: {
    userId: string;
    handle: string;
    did: string;
    service: string;
    displayName?: string;
  }): SocialAccountInfo {
    const file = load();
    const now = new Date().toISOString();
    const existing = file.accounts.find(
      (account) =>
        account.userId === input.userId &&
        account.provider === "bitsocial" &&
        account.did === input.did,
    );

    if (existing) {
      existing.handle = input.handle;
      existing.did = input.did;
      existing.service = input.service;
      existing.status = "connected";
      if (input.displayName !== undefined) existing.displayName = input.displayName;
      save(file);
      return toInfo(existing);
    }

    const id = crypto.randomUUID();
    const record: SocialAccountRecord = {
      id,
      userId: input.userId,
      provider: "bitsocial",
      handle: input.handle,
      did: input.did,
      service: input.service,
      status: "connected",
      connectedAt: now,
      displayName: input.displayName,
    };
    file.accounts.push(record);
    save(file);
    return toInfo(record);
  },

  /** Persist updated Bitsocial community subscriptions on an existing account. */
  updateBitsocialService(accountId: string, service: string): void {
    const file = load();
    const target = file.accounts.find((entry) => entry.id === accountId);
    if (!target || target.provider !== "bitsocial") {
      throw new Error("Bitsocial account not found");
    }
    target.service = service;
    target.status = "connected";
    save(file);
  },

  appPasswordFor(account: SocialAccountRecord): string {
    const password = vaultStore.getPlaintext(appPasswordVaultId(account.id));
    if (!password) throw new Error("Bluesky app password missing — reconnect the account");
    return password;
  },

  accessTokenFor(account: SocialAccountRecord): string {
    const token = vaultStore.getPlaintext(accessTokenVaultId(account.id));
    if (!token) throw new Error("Access token missing — reconnect the account");
    return token;
  },

  nsecFor(account: SocialAccountRecord): string {
    const nsec = vaultStore.getPlaintext(nsecVaultId(account.id));
    if (!nsec) throw new Error("Nostr private key missing — reconnect the account");
    return nsec;
  },

  sessionFor(account: SocialAccountRecord): BlueskySessionTokens | undefined {
    const raw = vaultStore.getPlaintext(sessionVaultId(account.id));
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as BlueskySessionTokens;
    } catch {
      return undefined;
    }
  },

  saveSession(accountId: string, session: BlueskySessionTokens): void {
    const file = load();
    const target = file.accounts.find((entry) => entry.id === accountId);
    if (!target) throw new Error("Social account not found");
    target.handle = session.handle;
    target.did = session.did;
    target.status = "connected";
    vaultStore.put({
      id: sessionVaultId(accountId),
      name: `Bluesky session (${session.handle})`,
      scope: "oauth",
      plaintext: JSON.stringify(session),
    });
    save(file);
  },

  markStatus(accountId: string, status: SocialAccountStatus): void {
    const file = load();
    const target = file.accounts.find((entry) => entry.id === accountId);
    if (!target) return;
    target.status = status;
    save(file);
  },

  disconnect(userId: string, accountId: string): boolean {
    const file = load();
    const target = file.accounts.find(
      (account) => account.userId === userId && account.id === accountId,
    );
    if (!target) return false;
    file.accounts = file.accounts.filter((account) => account.id !== accountId);
    save(file);
    vaultStore.delete(appPasswordVaultId(accountId));
    vaultStore.delete(sessionVaultId(accountId));
    vaultStore.delete(accessTokenVaultId(accountId));
    vaultStore.delete(nsecVaultId(accountId));
    return true;
  },
};

export { DEFAULT_SERVICE as BLUESKY_DEFAULT_SERVICE };
