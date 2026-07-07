export type PresenceStatus = "online" | "away" | "offline";

export const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  online: "Active now",
  away: "Active 26m ago",
  offline: "Offline",
};

export interface MessengerContact {
  id: string;
  name: string;
  status?: PresenceStatus;
  /** Optional header accent — mirrors Messenger chat themes. */
  headerAccent?: string;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
  typing?: boolean;
}

export type MessengerMessageKind = "text" | "link" | "image" | "video" | "call";

export interface MessengerLinkPreview {
  title: string;
  source: string;
  url?: string;
}

export interface MessengerCallSummary {
  duration: string;
  missed?: boolean;
}

export interface MessengerMessage {
  id: string;
  senderId: string;
  senderName?: string;
  kind: MessengerMessageKind;
  content?: string;
  linkPreview?: MessengerLinkPreview;
  mediaLabel?: string;
  call?: MessengerCallSummary;
  timestamp?: string;
  /** Centered day/time divider above this message. */
  divider?: string;
}
