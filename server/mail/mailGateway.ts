/**
 * Mail gateway — resolves the user's connected account and dispatches to the
 * Gmail OAuth or IMAP/SMTP adapter. Live proxy: no local mail cache in v1.
 */
import type {
  MailAccountInfo,
  MailFolderId,
  MailInboxFilter,
  MailOAuthStatus,
  MailPasswordConnectInput,
  MailSendInput,
  MailThread,
  MailThreadDetail,
} from "../../shared/mail.js";
import {
  getGmailThread,
  listGmailThreads,
  sendGmailMessage,
  setGmailThreadRead,
  setGmailThreadStarred,
} from "./adapters/gmail.js";
import {
  getImapThread,
  listImapThreads,
  sendImapMail,
  setImapRead,
  setImapStarred,
  verifyImapLogin,
} from "./adapters/imap.js";
import {
  clearGoogleOAuthSettings,
  googleOAuthPublicStatus,
  isGoogleOAuthConfigured,
  updateGoogleOAuthSettings,
} from "./googleOAuthConfig.js";
import { resolveImapEndpoints } from "./imapPresets.js";
import { mailStore } from "./mailStore.js";

async function withAccount<T>(
  userId: string,
  accountId: string | undefined,
  run: (account: NonNullable<ReturnType<typeof mailStore.getForUser>>) => Promise<T>,
): Promise<T> {
  const account = mailStore.getForUser(userId, accountId);
  if (!account) throw new Error("No mail account connected");
  try {
    return await run(account);
  } catch (err) {
    mailStore.markStatus(account.id, "error");
    throw err;
  }
}

export const mailGateway = {
  oauthConfigured(): boolean {
    return isGoogleOAuthConfigured();
  },

  oauthStatus(): MailOAuthStatus {
    return googleOAuthPublicStatus();
  },

  saveOAuthSettings(input: { clientId?: string; clientSecret?: string }): MailOAuthStatus {
    return updateGoogleOAuthSettings(input);
  },

  clearOAuthSettings(): MailOAuthStatus {
    return clearGoogleOAuthSettings();
  },

  listAccounts(userId: string): MailAccountInfo[] {
    return mailStore.listForUser(userId);
  },

  disconnect(userId: string, accountId: string): boolean {
    return mailStore.disconnect(userId, accountId);
  },

  async connectWithPassword(
    userId: string,
    input: MailPasswordConnectInput,
  ): Promise<MailAccountInfo> {
    const email = input.email.trim();
    const password = input.password;
    if (!email.includes("@")) throw new Error("Enter a valid email address");
    if (!password) throw new Error("Password is required");
    const endpoints = resolveImapEndpoints(email, input.endpoints);
    const auth = { email, password, endpoints };
    await verifyImapLogin(auth);
    return mailStore.upsertImapAccount({ userId, email, password, endpoints });
  },

  listThreads(
    userId: string,
    params: {
      accountId?: string;
      folder: MailFolderId;
      query?: string;
      filter?: MailInboxFilter;
    },
  ): Promise<MailThread[]> {
    return withAccount(userId, params.accountId, async (account) => {
      if (account.provider === "imap") {
        return listImapThreads(mailStore.imapAuthFor(account), {
          folder: params.folder,
          query: params.query,
          filter: params.filter,
        });
      }
      const accessToken = await mailStore.accessTokenFor(account);
      return listGmailThreads(accessToken, {
        folder: params.folder,
        query: params.query,
        filter: params.filter,
      });
    });
  },

  getThread(userId: string, threadId: string, accountId?: string): Promise<MailThreadDetail> {
    return withAccount(userId, accountId, async (account) => {
      if (account.provider === "imap") {
        return getImapThread(mailStore.imapAuthFor(account), threadId);
      }
      const accessToken = await mailStore.accessTokenFor(account);
      return getGmailThread(accessToken, threadId);
    });
  },

  send(userId: string, input: MailSendInput, accountId?: string): Promise<void> {
    return withAccount(userId, accountId, async (account) => {
      if (account.provider === "imap") {
        return sendImapMail(mailStore.imapAuthFor(account), input);
      }
      const accessToken = await mailStore.accessTokenFor(account);
      return sendGmailMessage(accessToken, input);
    });
  },

  setStarred(
    userId: string,
    threadId: string,
    starred: boolean,
    accountId?: string,
  ): Promise<void> {
    return withAccount(userId, accountId, async (account) => {
      if (account.provider === "imap") {
        return setImapStarred(mailStore.imapAuthFor(account), threadId, starred);
      }
      const accessToken = await mailStore.accessTokenFor(account);
      return setGmailThreadStarred(accessToken, threadId, starred);
    });
  },

  markRead(userId: string, threadId: string, read: boolean, accountId?: string): Promise<void> {
    return withAccount(userId, accountId, async (account) => {
      if (account.provider === "imap") {
        return setImapRead(mailStore.imapAuthFor(account), threadId, read);
      }
      const accessToken = await mailStore.accessTokenFor(account);
      return setGmailThreadRead(accessToken, threadId, read);
    });
  },
};
