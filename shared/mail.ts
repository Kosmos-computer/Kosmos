/** Mail API shapes shared between the Arco server and Email app. */

export type MailProvider = "google" | "imap";

export type MailAccountStatus = "connected" | "expired" | "error";

export type MailOAuthSource = "env" | "settings";

/** Public OAuth *app* status — never includes the client secret. */
export interface MailOAuthStatus {
  configured: boolean;
  source: MailOAuthSource | null;
  settingsStored: boolean;
  envConfigured: boolean;
  clientIdHint: string | null;
  redirectUri: string;
}

export interface MailImapEndpoints {
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
}

export interface MailPasswordConnectInput {
  email: string;
  password: string;
  /** Optional overrides; otherwise inferred from the email domain. */
  endpoints?: Partial<MailImapEndpoints>;
}

export interface MailAccountInfo {
  id: string;
  provider: MailProvider;
  email: string;
  status: MailAccountStatus;
  connectedAt: string;
}

export interface MailThread {
  id: string;
  senderName: string;
  subject: string;
  preview: string;
  timestamp: string;
  unread?: boolean;
  starred?: boolean;
}

export interface MailMessage {
  id: string;
  senderName: string;
  timestamp: string;
  /** Plain-text fallback / compose-friendly body. */
  body: string;
  /** Rich HTML body when the message includes text/html. */
  htmlBody?: string;
}

export interface MailThreadDetail {
  subject: string;
  messages: MailMessage[];
}

export type MailFolderId = "inbox" | "sent" | "archive" | "trash";

export type MailInboxFilter = "all" | "unread" | "starred";

export interface MailSendInput {
  to: string;
  subject: string;
  body: string;
}
