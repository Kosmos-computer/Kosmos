/**
 * IMAP/SMTP adapter — classic email + password (or app password) mail access.
 */
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";
import type {
  MailFolderId,
  MailInboxFilter,
  MailImapEndpoints,
  MailSendInput,
  MailThread,
  MailThreadDetail,
} from "../../../shared/mail.js";

const FOLDER_PATH: Record<MailFolderId, string[]> = {
  inbox: ["INBOX"],
  sent: ["Sent", "Sent Messages", "INBOX.Sent", "[Gmail]/Sent Mail"],
  archive: ["Archive", "INBOX.Archive", "[Gmail]/All Mail"],
  trash: ["Trash", "Deleted Messages", "INBOX.Trash", "[Gmail]/Trash"],
};

export interface ImapAccountAuth {
  email: string;
  password: string;
  endpoints: MailImapEndpoints;
}

async function withImap<T>(auth: ImapAccountAuth, run: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow({
    host: auth.endpoints.imapHost,
    port: auth.endpoints.imapPort,
    secure: true,
    auth: { user: auth.email, pass: auth.password },
    logger: false,
  });
  try {
    await client.connect();
    return await run(client);
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }
}

async function openFolder(client: ImapFlow, folder: MailFolderId): Promise<string> {
  const candidates = FOLDER_PATH[folder];
  let lastError: unknown;
  for (const path of candidates) {
    try {
      const mailbox = await client.mailboxOpen(path);
      return mailbox.path;
    } catch (err) {
      lastError = err;
    }
  }
  if (folder === "inbox") {
    const mailbox = await client.mailboxOpen("INBOX");
    return mailbox.path;
  }
  throw lastError instanceof Error ? lastError : new Error(`Mailbox not found for ${folder}`);
}

function formatTimestamp(date: Date | undefined): string {
  if (!date) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function displayName(from: { name?: string; address?: string } | undefined): string {
  if (!from) return "Unknown";
  if (from.name?.trim()) return from.name.trim();
  return from.address?.trim() || "Unknown";
}

function asUidList(value: number[] | false): number[] {
  return Array.isArray(value) ? value : [];
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function htmlToPlainText(html: string): string {
  return decodeBasicEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\u200c|\u200b|\ufeff/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

async function parseMessageContent(source: Buffer | string): Promise<{ body: string; htmlBody?: string }> {
  const parsed = await simpleParser(source);
  const attachments = parsed.attachments ?? [];

  let html = parsed.html ? String(parsed.html) : "";
  if (html) {
    html = html.replace(/cid:([^"'>\s]+)/gi, (_match, rawCid: string) => {
      const cid = rawCid.replace(/^<|>$/g, "").trim();
      const attachment = attachments.find((item) => {
        const id = (item.contentId ?? item.cid ?? "").replace(/^<|>$/g, "").trim();
        return id === cid;
      });
      if (!attachment?.content) return _match;
      const mime = attachment.contentType || "application/octet-stream";
      const base64 = Buffer.isBuffer(attachment.content)
        ? attachment.content.toString("base64")
        : Buffer.from(String(attachment.content)).toString("base64");
      return `data:${mime};base64,${base64}`;
    });
    // Strip active content before handing to the client iframe.
    html = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+=(["']).*?\1/gi, "")
      .replace(/\son\w+=([^\s>]+)/gi, "");
  }

  const text = parsed.text?.trim()
    ? parsed.text
        .replace(/\u200c|\u200b|\ufeff/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : html
      ? htmlToPlainText(html)
      : "";

  return {
    body: text.slice(0, 50_000) || "(empty message)",
    htmlBody: html ? html.slice(0, 500_000) : undefined,
  };
}

export async function verifyImapLogin(auth: ImapAccountAuth): Promise<void> {
  await withImap(auth, async (client) => {
    await client.mailboxOpen("INBOX");
  });
}

export async function listImapThreads(
  auth: ImapAccountAuth,
  params: {
    folder: MailFolderId;
    query?: string;
    filter?: MailInboxFilter;
  },
): Promise<MailThread[]> {
  return withImap(auth, async (client) => {
    const mailboxPath = await openFolder(client, params.folder);
    const lock = await client.getMailboxLock(mailboxPath);
    try {
      const exists = typeof client.mailbox === "object" && client.mailbox ? client.mailbox.exists : 0;
      if (exists === 0) return [];

      const searchQuery: Record<string, unknown> = { all: true };
      if (params.filter === "unread") searchQuery.seen = false;
      if (params.filter === "starred") searchQuery.flagged = true;
      if (params.query?.trim()) searchQuery.or = [{ subject: params.query.trim() }, { from: params.query.trim() }];

      let uids = asUidList(await client.search(searchQuery, { uid: true }));
      if (uids.length === 0 && (params.filter || params.query)) {
        uids = asUidList(await client.search({ all: true }, { uid: true }));
      }
      if (uids.length === 0) return [];

      const recent = uids.slice(-40).reverse();
      const threads: MailThread[] = [];

      for await (const msg of client.fetch(recent, { uid: true, envelope: true, flags: true }, { uid: true })) {
        const envelope = msg.envelope;
        const from = envelope?.from?.[0];
        const flags = msg.flags ?? new Set<string>();
        const subject = envelope?.subject?.trim() || "(no subject)";
        threads.push({
          id: String(msg.uid),
          senderName: displayName(from),
          subject,
          preview: subject,
          timestamp: formatTimestamp(envelope?.date),
          unread: !flags.has("\\Seen"),
          starred: flags.has("\\Flagged"),
        });
      }

      if (params.filter === "unread") return threads.filter((t) => t.unread);
      if (params.filter === "starred") return threads.filter((t) => t.starred);
      if (params.query?.trim()) {
        const q = params.query.trim().toLowerCase();
        return threads.filter(
          (t) => t.subject.toLowerCase().includes(q) || t.senderName.toLowerCase().includes(q),
        );
      }
      return threads;
    } finally {
      lock.release();
    }
  });
}

export async function getImapThread(
  auth: ImapAccountAuth,
  threadId: string,
  folder: MailFolderId = "inbox",
): Promise<MailThreadDetail> {
  const uid = Number(threadId);
  if (!Number.isFinite(uid)) throw new Error("Invalid message id");

  return withImap(auth, async (client) => {
    const mailboxPath = await openFolder(client, folder);
    const lock = await client.getMailboxLock(mailboxPath);
    try {
      let subject = "(no subject)";
      let senderName = "Unknown";
      let timestamp = "";
      let body = "";
      let htmlBody: string | undefined;
      for await (const msg of client.fetch(String(uid), { uid: true, envelope: true, source: true }, { uid: true })) {
        const envelope = msg.envelope;
        subject = envelope?.subject?.trim() || "(no subject)";
        senderName = displayName(envelope?.from?.[0]);
        timestamp = formatTimestamp(envelope?.date);
        if (msg.source) {
          const parsed = await parseMessageContent(msg.source);
          body = parsed.body;
          htmlBody = parsed.htmlBody;
        }
      }
      if (!body && !subject) throw new Error("Message not found");
      return {
        subject,
        messages: [{ id: threadId, senderName, timestamp, body: body || "(empty message)", htmlBody }],
      };
    } finally {
      lock.release();
    }
  });
}

export async function setImapStarred(
  auth: ImapAccountAuth,
  threadId: string,
  starred: boolean,
  folder: MailFolderId = "inbox",
): Promise<void> {
  const uid = Number(threadId);
  if (!Number.isFinite(uid)) throw new Error("Invalid message id");
  await withImap(auth, async (client) => {
    await openFolder(client, folder);
    if (starred) await client.messageFlagsAdd({ uid }, ["\\Flagged"], { uid: true });
    else await client.messageFlagsRemove({ uid }, ["\\Flagged"], { uid: true });
  });
}

export async function setImapRead(
  auth: ImapAccountAuth,
  threadId: string,
  read: boolean,
  folder: MailFolderId = "inbox",
): Promise<void> {
  const uid = Number(threadId);
  if (!Number.isFinite(uid)) throw new Error("Invalid message id");
  await withImap(auth, async (client) => {
    await openFolder(client, folder);
    if (read) await client.messageFlagsAdd({ uid }, ["\\Seen"], { uid: true });
    else await client.messageFlagsRemove({ uid }, ["\\Seen"], { uid: true });
  });
}

export async function sendImapMail(auth: ImapAccountAuth, input: MailSendInput): Promise<void> {
  const transport = nodemailer.createTransport({
    host: auth.endpoints.smtpHost,
    port: auth.endpoints.smtpPort,
    secure: auth.endpoints.smtpSecure,
    auth: { user: auth.email, pass: auth.password },
  });
  await transport.sendMail({
    from: auth.email,
    to: input.to,
    subject: input.subject,
    text: input.body,
  });
}
