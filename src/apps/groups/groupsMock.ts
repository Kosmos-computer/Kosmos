import type { TeamChannel, TeamDirectMessage, TeamMember, TeamMessage, TeamNavItem, TeamWorkspaceItem } from "./types";

export const TEAM_NAV_ITEMS: TeamNavItem[] = [
  { id: "home", label: "Home", icon: "home", active: true },
  { id: "dms", label: "DMs", icon: "chat", badgeCount: 8 },
  { id: "activity", label: "Activity", icon: "bell", badgeCount: 23 },
  { id: "files", label: "Files", icon: "folder" },
  { id: "later", label: "Later", icon: "bookmark" },
];

export const TEAM_CHANNELS: TeamChannel[] = [
  { id: "ch-events", name: "summer-picnic", unread: true, mentionCount: 1, icon: { emoji: "☀️", hue: "amber" } },
  { id: "ch-general", name: "announcements", icon: { emoji: "📣", hue: "rose" } },
  { id: "ch-random", name: "water-cooler", icon: { emoji: "💬", hue: "violet" } },
  { id: "ch-product", name: "event-updates", icon: { emoji: "📅", hue: "blue" } },
  { id: "ch-infra", name: "facilities", icon: { emoji: "🏢", hue: "slate" } },
];

export const TEAM_DIRECT_MESSAGES: TeamDirectMessage[] = [
  { id: "dm-riley", name: "Riley Chen", status: "online", unreadCount: 2 },
  { id: "dm-jordan", name: "Jordan Hayes", status: "away" },
  { id: "dm-sam", name: "Sam Patel", status: "offline" },
  { id: "dm-design", name: "Product Team", isGroup: true, unreadCount: 1 },
];

export const TEAM_CHANNEL_TOPICS: Record<string, string> = {
  "ch-events": "Community events, meetups, and volunteer gatherings",
  "ch-general": "Team announcements and general chat",
};

export const TEAM_CHANNEL_MESSAGES: Record<string, TeamMessage[]> = {
  "ch-events": [
    {
      id: "e1",
      senderId: "casey-walsh",
      senderName: "Casey Walsh",
      content: "Heads up — we're locking the summer picnic agenda by Friday.",
      timestamp: "Jun 23rd at 11:27 AM",
    },
    {
      id: "e2",
      senderId: "riley-chen",
      senderName: "Riley Chen",
      content: "Can we add a volunteer orientation session?",
      timestamp: "Jun 23rd at 11:31 AM",
    },
    {
      id: "e3",
      senderId: "me",
      senderName: "Alex Morgan",
      content: "Perfect — let's keep Thursday afternoon open for a walkthrough.",
      timestamp: "Jun 23rd at 11:38 AM",
    },
  ],
  "ch-general": [
    {
      id: "g1",
      senderId: "sam-patel",
      senderName: "Sam Patel",
      content: "Welcome to everyone who joined this week 👋",
      timestamp: "Jun 22nd at 9:02 AM",
    },
  ],
  "ch-random": [
    {
      id: "x1",
      senderId: "riley-chen",
      senderName: "Riley Chen",
      content: "Anyone else excited for the picnic lemonade stand?",
      timestamp: "Jun 22nd at 4:22 PM",
    },
  ],
};

export const TEAM_DM_MESSAGES: Record<string, TeamMessage[]> = {
  "dm-riley": [
    { id: "dm1", senderId: "riley-chen", senderName: "Riley Chen", content: "Can you review the welcome table layout?", timestamp: "10:02 AM" },
    { id: "dm2", senderId: "me", senderName: "Alex Morgan", content: "On it — looks great so far.", timestamp: "10:04 AM" },
  ],
  "dm-jordan": [
    { id: "dm3", senderId: "jordan-hayes", senderName: "Jordan Hayes", content: "Uploaded updated poster mockups.", timestamp: "Yesterday" },
  ],
};

export const TEAM_MEMBERS: Record<string, TeamMember> = {
  "riley-chen": { id: "riley-chen", name: "Riley Chen", title: "Staff Engineer", email: "riley@meridian.dev", status: "online" },
  "jordan-hayes": { id: "jordan-hayes", name: "Jordan Hayes", title: "Product Design", email: "jordan@meridian.dev", status: "away" },
  me: { id: "me", name: "Alex Morgan", title: "Founder", email: "alex@meridian.dev", status: "online" },
};

export function teamWorkspacesFromConnections(
  connections: { id: string; label: string; provider: string }[],
): TeamWorkspaceItem[] {
  if (connections.length === 0) return [];
  return connections.map((connection, index) => ({
    id: connection.id,
    label: connection.label,
    initials: connection.label.slice(0, 2).toUpperCase(),
    accent: ["#611f69", "#1264a3", "#2bac76", "#e01e5a"][index % 4],
    unreadCount: index === 0 ? 3 : undefined,
  }));
}
