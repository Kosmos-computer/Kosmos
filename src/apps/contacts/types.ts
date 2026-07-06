export type ContactAccountKind = "local" | "google" | "icloud" | "carddav";

export interface ContactAccount {
  id: string;
  label: string;
  kind: ContactAccountKind;
  email?: string;
  initials: string;
  accent: string;
}

export interface PhoneContact {
  id: string;
  accountId: string;
  name: string;
  phone: string;
  phoneLabel?: string;
  email?: string;
  company?: string;
  title?: string;
  favorite?: boolean;
}

export interface ContactInput {
  name: string;
  phone: string;
  phoneLabel?: string;
  email?: string;
  company?: string;
  title?: string;
  favorite?: boolean;
}

export type ContactImportMode = "merge" | "replace";

export type DialPadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "*" | "#";

export const DIAL_PAD_KEYS: (DialPadKey | null)[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

export const DIAL_PAD_LETTERS: Partial<Record<DialPadKey, string>> = {
  "2": "ABC",
  "3": "DEF",
  "4": "GHI",
  "5": "JKL",
  "6": "MNO",
  "7": "PQRS",
  "8": "TUV",
  "9": "WXYZ",
};

export const CONTACT_ACCOUNT_KIND_LABELS: Record<ContactAccountKind, string> = {
  local: "On device",
  google: "Google",
  icloud: "iCloud",
  carddav: "CardDAV",
};
