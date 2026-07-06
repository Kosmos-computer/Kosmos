export type TeamChannelIconHue = "green" | "teal" | "amber" | "rose" | "slate" | "orange" | "blue" | "violet";

export interface TeamWorkspaceItem {
  id: string;
  label: string;
  initials: string;
  accent?: string;
  unreadCount?: number;
}

export interface TeamChannel {
  id: string;
  name: string;
  icon?: { emoji?: string; hue?: TeamChannelIconHue };
  unread?: boolean;
  mentionCount?: number;
}

export interface TeamDirectMessage {
  id: string;
  name: string;
  status?: "online" | "away" | "offline";
  unreadCount?: number;
  isGroup?: boolean;
}

export interface TeamMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

export interface TeamMember {
  id: string;
  name: string;
  title?: string;
  email?: string;
  status?: "online" | "away" | "offline";
}

export interface TeamNavItem {
  id: string;
  label: string;
  icon: "home" | "chat" | "bell" | "folder" | "bookmark";
  badgeCount?: number;
  active?: boolean;
}
