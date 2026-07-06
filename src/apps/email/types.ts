export type EmailInboxFilter = "all" | "unread" | "starred";

export interface EmailThread {
  id: string;
  senderName: string;
  subject: string;
  preview: string;
  timestamp: string;
  unread?: boolean;
  starred?: boolean;
}

export interface EmailMessage {
  id: string;
  senderName: string;
  timestamp: string;
  body: string;
}

export interface MailFolder {
  id: string;
  label: string;
  icon: "inbox" | "send" | "archive" | "trash";
}
