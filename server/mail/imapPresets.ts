/**
 * Infer IMAP/SMTP hosts from a mailbox address (common consumer providers).
 */
import type { MailImapEndpoints } from "../../shared/mail.js";

const PRESETS: Record<string, MailImapEndpoints> = {
  "gmail.com": {
    imapHost: "imap.gmail.com",
    imapPort: 993,
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    smtpSecure: true,
  },
  "googlemail.com": {
    imapHost: "imap.gmail.com",
    imapPort: 993,
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    smtpSecure: true,
  },
  "outlook.com": {
    imapHost: "outlook.office365.com",
    imapPort: 993,
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
    smtpSecure: false,
  },
  "hotmail.com": {
    imapHost: "outlook.office365.com",
    imapPort: 993,
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
    smtpSecure: false,
  },
  "live.com": {
    imapHost: "outlook.office365.com",
    imapPort: 993,
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
    smtpSecure: false,
  },
  "yahoo.com": {
    imapHost: "imap.mail.yahoo.com",
    imapPort: 993,
    smtpHost: "smtp.mail.yahoo.com",
    smtpPort: 465,
    smtpSecure: true,
  },
  "icloud.com": {
    imapHost: "imap.mail.me.com",
    imapPort: 993,
    smtpHost: "smtp.mail.me.com",
    smtpPort: 587,
    smtpSecure: false,
  },
  "me.com": {
    imapHost: "imap.mail.me.com",
    imapPort: 993,
    smtpHost: "smtp.mail.me.com",
    smtpPort: 587,
    smtpSecure: false,
  },
  "mac.com": {
    imapHost: "imap.mail.me.com",
    imapPort: 993,
    smtpHost: "smtp.mail.me.com",
    smtpPort: 587,
    smtpSecure: false,
  },
};

export function resolveImapEndpoints(
  email: string,
  overrides?: Partial<MailImapEndpoints>,
): MailImapEndpoints {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  const preset = PRESETS[domain];
  if (!preset && !overrides?.imapHost) {
    throw new Error(
      `No IMAP preset for @${domain}. Add imapHost/smtpHost, or use a Gmail / Outlook / Yahoo / iCloud address.`,
    );
  }
  const base: MailImapEndpoints = preset ?? {
    imapHost: `imap.${domain}`,
    imapPort: 993,
    smtpHost: `smtp.${domain}`,
    smtpPort: 465,
    smtpSecure: true,
  };
  return {
    imapHost: overrides?.imapHost?.trim() || base.imapHost,
    imapPort: overrides?.imapPort ?? base.imapPort,
    smtpHost: overrides?.smtpHost?.trim() || base.smtpHost,
    smtpPort: overrides?.smtpPort ?? base.smtpPort,
    smtpSecure: overrides?.smtpSecure ?? base.smtpSecure,
  };
}

export function isGmailAddress(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return domain === "gmail.com" || domain === "googlemail.com";
}
