/**
 * Mail gateway — resolves the user's connected account and dispatches to the
 * provider adapter. Live proxy: no local mail cache in v1.
 */
import type {
  MailAccountInfo,
  MailFolderId,
  MailInboxFilter,
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
import { isGoogleOAuthConfigured } from "./googleOAuth.js";
import { mailStore } from "./mailStore.js";

async function withAccessToken<T>(
  userId: string,
  accountId: string | undefined,
  run: (accessToken: string) => Promise<T>,
): Promise<T> {
  const account = mailStore.getForUser(userId, accountId);
  if (!account) throw new Error("No mail account connected");
  try {
    const accessToken = await mailStore.accessTokenFor(account);
    return await run(accessToken);
  } catch (err) {
    mailStore.markStatus(account.id, "error");
    throw err;
  }
}

export const mailGateway = {
  oauthConfigured(): boolean {
    return isGoogleOAuthConfigured();
  },

  listAccounts(userId: string): MailAccountInfo[] {
    return mailStore.listForUser(userId);
  },

  disconnect(userId: string, accountId: string): boolean {
    return mailStore.disconnect(userId, accountId);
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
    return withAccessToken(userId, params.accountId, (accessToken) =>
      listGmailThreads(accessToken, {
        folder: params.folder,
        query: params.query,
        filter: params.filter,
      }),
    );
  },

  getThread(userId: string, threadId: string, accountId?: string): Promise<MailThreadDetail> {
    return withAccessToken(userId, accountId, (accessToken) => getGmailThread(accessToken, threadId));
  },

  send(userId: string, input: MailSendInput, accountId?: string): Promise<void> {
    return withAccessToken(userId, accountId, (accessToken) => sendGmailMessage(accessToken, input));
  },

  setStarred(
    userId: string,
    threadId: string,
    starred: boolean,
    accountId?: string,
  ): Promise<void> {
    return withAccessToken(userId, accountId, (accessToken) =>
      setGmailThreadStarred(accessToken, threadId, starred),
    );
  },

  markRead(userId: string, threadId: string, read: boolean, accountId?: string): Promise<void> {
    return withAccessToken(userId, accountId, (accessToken) =>
      setGmailThreadRead(accessToken, threadId, read),
    );
  },
};
