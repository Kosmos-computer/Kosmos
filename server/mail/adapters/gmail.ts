/**
 * Gmail adapter — live proxy over the Gmail REST API.
 * Maps provider payloads into Arco's mail thread/message shapes.
 */
import type {
  MailFolderId,
  MailInboxFilter,
  MailMessage,
  MailSendInput,
  MailThread,
  MailThreadDetail,
} from "../../../shared/mail.js";

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

const FOLDER_LABELS: Record<MailFolderId, string[]> = {
  inbox: ["INBOX"],
  sent: ["SENT"],
  archive: [],
  trash: ["TRASH"],
};

interface GmailHeader {
  name?: string;
  value?: string;
}

interface GmailMessagePart {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
}

interface GmailMessage {
  id: string;
  threadId?: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart & { headers?: GmailHeader[] };
}

interface GmailThread {
  id: string;
  snippet?: string;
  historyId?: string;
  messages?: GmailMessage[];
}

async function gmailFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GMAIL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Gmail API error (${res.status})`);
  }
  return data;
}

function headerValue(headers: GmailHeader[] | undefined, name: string): string {
  const match = headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase());
  return match?.value?.trim() ?? "";
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf-8");
}

function extractBody(part: GmailMessagePart | undefined): string {
  if (!part) return "";
  if (part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  if (part.parts?.length) {
    const plain = part.parts.find((child) => child.mimeType === "text/plain");
    if (plain) return extractBody(plain);
    const html = part.parts.find((child) => child.mimeType === "text/html");
    if (html) {
      const raw = extractBody(html);
      return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
    for (const child of part.parts) {
      const nested = extractBody(child);
      if (nested) return nested;
    }
  }
  return "";
}

function formatTimestamp(internalDate?: string): string {
  if (!internalDate) return "";
  const date = new Date(Number(internalDate));
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function parseSender(fromHeader: string): string {
  const match = fromHeader.match(/^"?([^"<]+)"?\s*(?:<.*>)?$/);
  return (match?.[1] ?? fromHeader).trim() || "Unknown";
}

function toThreadSummary(thread: GmailThread): MailThread {
  const messages = thread.messages ?? [];
  const latest = messages[messages.length - 1];
  const headers = latest?.payload?.headers;
  const subject = headerValue(headers, "Subject") || "(No subject)";
  const senderName = parseSender(headerValue(headers, "From"));
  const labelIds = latest?.labelIds ?? [];
  return {
    id: thread.id,
    senderName,
    subject,
    preview: thread.snippet ?? latest?.snippet ?? "",
    timestamp: formatTimestamp(latest?.internalDate),
    unread: labelIds.includes("UNREAD"),
    starred: labelIds.includes("STARRED"),
  };
}

function toMessage(message: GmailMessage): MailMessage {
  const headers = message.payload?.headers;
  return {
    id: message.id,
    senderName: parseSender(headerValue(headers, "From")),
    timestamp: formatTimestamp(message.internalDate),
    body: extractBody(message.payload) || message.snippet || "",
  };
}

function buildListQuery(filter: MailInboxFilter, search?: string): string | undefined {
  const parts: string[] = [];
  if (filter === "unread") parts.push("is:unread");
  if (filter === "starred") parts.push("is:starred");
  if (search?.trim()) parts.push(search.trim());
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export async function listGmailThreads(
  accessToken: string,
  params: { folder: MailFolderId; query?: string; filter?: MailInboxFilter },
): Promise<MailThread[]> {
  const labelIds = FOLDER_LABELS[params.folder];
  const q = buildListQuery(params.filter ?? "all", params.query);
  const search = new URLSearchParams({ maxResults: "50" });
  for (const label of labelIds) search.append("labelIds", label);
  if (q) search.set("q", q);

  const listed = await gmailFetch<{ threads?: { id: string }[] }>(
    accessToken,
    `/threads?${search.toString()}`,
  );
  const ids = listed.threads?.map((thread) => thread.id) ?? [];
  const threads = await Promise.all(
    ids.map(async (id) => {
      const thread = await gmailFetch<GmailThread>(
        accessToken,
        `/threads/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
      );
      return toThreadSummary(thread);
    }),
  );

  if (params.filter === "unread") return threads.filter((thread) => thread.unread);
  if (params.filter === "starred") return threads.filter((thread) => thread.starred);
  return threads;
}

export async function getGmailThread(accessToken: string, threadId: string): Promise<MailThreadDetail> {
  const thread = await gmailFetch<GmailThread>(
    accessToken,
    `/threads/${encodeURIComponent(threadId)}?format=full`,
  );
  const messages = (thread.messages ?? []).map(toMessage);
  const subject =
    headerValue(thread.messages?.[0]?.payload?.headers, "Subject") ||
    messages[0]?.body.slice(0, 80) ||
    "(No subject)";
  return { subject, messages };
}

export async function sendGmailMessage(accessToken: string, input: MailSendInput): Promise<void> {
  const to = input.to.trim();
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!to || !subject || !body) throw new Error("to, subject, and body are required");

  const rawMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n");
  const raw = Buffer.from(rawMessage, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmailFetch(accessToken, "/messages/send", {
    method: "POST",
    body: JSON.stringify({ raw }),
  });
}

export async function setGmailThreadStarred(
  accessToken: string,
  threadId: string,
  starred: boolean,
): Promise<void> {
  const thread = await gmailFetch<GmailThread>(
    accessToken,
    `/threads/${encodeURIComponent(threadId)}?format=minimal`,
  );
  const messageIds = thread.messages?.map((message) => message.id) ?? [];
  await Promise.all(
    messageIds.map((messageId) =>
      gmailFetch(accessToken, `/messages/${encodeURIComponent(messageId)}/modify`, {
        method: "POST",
        body: JSON.stringify(
          starred
            ? { addLabelIds: ["STARRED"] }
            : { removeLabelIds: ["STARRED"] },
        ),
      }),
    ),
  );
}

export async function setGmailThreadRead(
  accessToken: string,
  threadId: string,
  read: boolean,
): Promise<void> {
  const thread = await gmailFetch<GmailThread>(
    accessToken,
    `/threads/${encodeURIComponent(threadId)}?format=minimal`,
  );
  const messageIds = thread.messages?.map((message) => message.id) ?? [];
  await Promise.all(
    messageIds.map((messageId) =>
      gmailFetch(accessToken, `/messages/${encodeURIComponent(messageId)}/modify`, {
        method: "POST",
        body: JSON.stringify(
          read ? { removeLabelIds: ["UNREAD"] } : { addLabelIds: ["UNREAD"] },
        ),
      }),
    ),
  );
}
