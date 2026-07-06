import type { EmailMessage, EmailThread, MailFolder } from "./types";

export const MAIL_FOLDERS: MailFolder[] = [
  { id: "inbox", label: "Inbox", icon: "inbox" },
  { id: "sent", label: "Sent", icon: "send" },
  { id: "archive", label: "Archive", icon: "archive" },
  { id: "trash", label: "Trash", icon: "trash" },
];

export const EMAIL_THREADS: EmailThread[] = [
  {
    id: "t1",
    senderName: "Sam Patel",
    subject: "Summer picnic volunteer schedule",
    preview: "Thanks to everyone who signed up — here's the final shift list for Saturday...",
    timestamp: "9:12 AM",
    unread: true,
    starred: true,
  },
  {
    id: "t2",
    senderName: "Jordan Hayes",
    subject: "Re: Event poster draft",
    preview: "The layout looks great — I left a couple of notes on the welcome banner copy...",
    timestamp: "8:47 AM",
    unread: true,
  },
  {
    id: "t3",
    senderName: "Facilities Desk",
    subject: "Room change for Thursday workshop",
    preview: "The community room is booked, so we moved you to Redwood Hall B...",
    timestamp: "Yesterday",
  },
  {
    id: "t4",
    senderName: "Riley Chen",
    subject: "Updated color palette for signage",
    preview: "Attached the revised palette for banners and name tags — mostly warmer accent tones...",
    timestamp: "Yesterday",
  },
  {
    id: "t5",
    senderName: "Volunteer Coordination",
    subject: "Your panel schedule for Thursday",
    preview: "Here's the finalized lineup and moderator notes for the neighborhood forum...",
    timestamp: "Mon",
  },
];

export const EMAIL_MESSAGES: Record<string, { subject: string; messages: EmailMessage[] }> = {
  t1: {
    subject: "Summer picnic volunteer schedule",
    messages: [
      {
        id: "m1",
        senderName: "Sam Patel",
        timestamp: "9:12 AM",
        body:
          "Hi everyone — the volunteer schedule for Saturday is set. Highlights:\n\n" +
          "• Check-in table covered from 10:00–11:30 AM\n" +
          "• Two food stations staffed through lunch service\n" +
          "• Cleanup crew confirmed for 2:30 PM\n\n" +
          "Reply if you need to swap a shift.",
      },
    ],
  },
  t2: {
    subject: "Re: Event poster draft",
    messages: [
      {
        id: "m1",
        senderName: "Jordan Hayes",
        timestamp: "8:47 AM",
        body:
          "This looks great — left a couple of notes on the welcome banner copy. Mostly wording tweaks, nothing blocking print.",
      },
    ],
  },
  t3: {
    subject: "Room change for Thursday workshop",
    messages: [
      {
        id: "m1",
        senderName: "Facilities Desk",
        timestamp: "Yesterday",
        body: "The community room is booked, so we moved you to Redwood Hall B. Same start time — signage will be updated at the entrance.",
      },
    ],
  },
};

export const DEFAULT_THREAD_ID = "t1";
