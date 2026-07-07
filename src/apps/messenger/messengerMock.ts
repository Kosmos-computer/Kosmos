import type { MessengerContact, MessengerMessage } from "./types";

export const MESSENGER_CONTACTS: MessengerContact[] = [
  {
    id: "c-alex",
    name: "Alex Rivera",
    status: "online",
    lastMessage: "https://facebook.com/...",
    timestamp: "7:33 PM",
    unreadCount: 2,
  },
  {
    id: "c-jordan",
    name: "Jordan Lee",
    status: "away",
    headerAccent: "#7b3fe4",
    lastMessage: "That looks amazing!",
    timestamp: "6:12 PM",
    unreadCount: 0,
  },
  {
    id: "c-sam",
    name: "Sam Patel",
    status: "online",
    lastMessage: "Video call · 50 mins",
    timestamp: "Yesterday",
    unreadCount: 1,
  },
  {
    id: "c-morgan",
    name: "Morgan Chen",
    status: "offline",
    lastMessage: "See you tomorrow",
    timestamp: "Mon",
    unreadCount: 0,
  },
  {
    id: "c-riley",
    name: "Riley Brooks",
    status: "online",
    lastMessage: "Sent a photo",
    timestamp: "Sun",
    unreadCount: 0,
    typing: true,
  },
];

export const MESSENGER_THREADS: Record<string, MessengerMessage[]> = {
  "c-alex": [
    { id: "m1", senderId: "c-alex", kind: "text", content: "Hey — did you see this?", timestamp: "7:30 PM" },
    { id: "m2", senderId: "c-alex", kind: "link", linkPreview: { title: "Facebook", source: "facebook.com" }, timestamp: "7:31 PM" },
    { id: "m3", senderId: "me", kind: "text", content: "Opening now", timestamp: "7:32 PM" },
    { id: "m4", senderId: "c-alex", kind: "text", content: "Let me know what you think", timestamp: "7:33 PM", divider: "7:33 PM" },
  ],
  "c-jordan": [
    { id: "m1", senderId: "c-jordan", kind: "text", content: "Dinner at the new place tonight?", timestamp: "5:40 PM" },
    { id: "m2", senderId: "me", kind: "text", content: "Yes! I'll bring dessert", timestamp: "5:45 PM" },
    {
      id: "m3",
      senderId: "c-jordan",
      kind: "image",
      mediaLabel: "Pasta photo",
      content: "Look at this spread",
      timestamp: "6:10 PM",
      divider: "6:12 PM",
    },
    { id: "m4", senderId: "me", kind: "text", content: "That looks amazing!", timestamp: "6:12 PM" },
  ],
  "c-sam": [
    { id: "m1", senderId: "c-sam", kind: "text", content: "Quick sync on the deck?", timestamp: "2:00 PM" },
    { id: "m2", senderId: "me", kind: "text", content: "Calling you now", timestamp: "2:05 PM" },
    {
      id: "m3",
      senderId: "system",
      kind: "call",
      call: { duration: "50 mins" },
      timestamp: "3:00 PM",
      divider: "Yesterday",
    },
    { id: "m4", senderId: "c-sam", kind: "video", mediaLabel: "Screen recording", timestamp: "3:05 PM" },
  ],
  "c-morgan": [
    { id: "m1", senderId: "me", kind: "text", content: "Still on for lunch Friday?", timestamp: "Mon" },
    { id: "m2", senderId: "c-morgan", kind: "text", content: "See you tomorrow", timestamp: "Mon" },
  ],
  "c-riley": [
    { id: "m1", senderId: "c-riley", kind: "image", mediaLabel: "Sunset", timestamp: "Sun" },
  ],
};

/** Default popout conversations shown in the dock view (matches reference UI). */
export const DEFAULT_POPOUT_IDS = ["c-alex", "c-jordan", "c-sam"] as const;
