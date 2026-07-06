/** Mail API shapes shared between the Arco server and Email app. */

export type MailProvider = "google";

export type MailAccountStatus = "connected" | "expired" | "error";

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
  body: string;
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
