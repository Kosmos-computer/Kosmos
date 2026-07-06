import type { ContactAccount, PhoneContact } from "./types";

export const SEED_ACCOUNTS: ContactAccount[] = [
  {
    id: "acct-personal",
    label: "Personal",
    kind: "local",
    initials: "Pe",
    accent: "#0085ff",
  },
  {
    id: "acct-work",
    label: "Work",
    kind: "local",
    initials: "Wk",
    accent: "#6366f1",
  },
];

/** STUB seed — replaced at runtime by contactsStore; kept for first-run bootstrap. */
export const CONTACTS_MOCK: PhoneContact[] = [
  {
    id: "p1",
    accountId: "acct-personal",
    name: "Riley Chen",
    phone: "+1 (415) 555-0142",
    phoneLabel: "Mobile",
    email: "riley@meridian.dev",
    company: "Meridian Labs",
    title: "Engineering",
    favorite: true,
  },
  {
    id: "p2",
    accountId: "acct-work",
    name: "Jordan Hayes",
    phone: "+1 (628) 555-0198",
    phoneLabel: "Work",
    email: "jordan@meridian.dev",
    company: "Meridian Labs",
    title: "Design",
  },
  {
    id: "p3",
    accountId: "acct-work",
    name: "Sam Patel",
    phone: "+1 (510) 555-0177",
    phoneLabel: "Mobile",
    email: "sam@meridian.dev",
    company: "Meridian Labs",
    title: "Platform",
    favorite: true,
  },
  {
    id: "p4",
    accountId: "acct-work",
    name: "Alex Morgan",
    phone: "+1 (206) 555-0103",
    phoneLabel: "Mobile",
    email: "alex@meridian.dev",
    company: "Meridian Labs",
    title: "Founder",
  },
  {
    id: "p5",
    accountId: "acct-work",
    name: "Acme Support",
    phone: "+1 (800) 555-0199",
    phoneLabel: "Main line",
    company: "Acme Corp",
  },
  {
    id: "p6",
    accountId: "acct-personal",
    name: "Front Desk",
    phone: "+1 (415) 555-0100",
    phoneLabel: "Office",
    company: "WeWork Mission",
  },
];

export const DEFAULT_ACCOUNT_ID = SEED_ACCOUNTS[0].id;
