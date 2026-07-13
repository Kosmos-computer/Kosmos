/**
 * Mail → agent tools. Lets the chat agent read and send mail through the
 * same gateway the Email app uses (IMAP or Gmail OAuth). Opening the Email
 * window alone does not expose inbox contents — these tools do.
 */
import { registerToolContributor } from "../agent/toolRegistry.js";
import type { ToolContext } from "../agent/tools.js";
import type { MailFolderId, MailInboxFilter } from "../../shared/mail.js";
import { mailGateway } from "./mailGateway.js";
import { mailStore } from "./mailStore.js";

const FOLDERS = new Set<MailFolderId>(["inbox", "sent", "archive", "trash"]);
const FILTERS = new Set<MailInboxFilter>(["all", "unread", "starred"]);

function resolveUserId(ctx: ToolContext): string {
  if (ctx.userId) return ctx.userId;
  const fallback = mailStore.anyConnectedUserId();
  if (fallback) return fallback;
  throw new Error(
    "No mail account connected. Ask the user to open the Email app and sign in with email + password (or Google).",
  );
}

function clip(text: string, max = 4_000): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

registerToolContributor((ctx) => {
  const accounts = (() => {
    try {
      return mailGateway.listAccounts(resolveUserId(ctx));
    } catch {
      return [];
    }
  })();

  const accountHint =
    accounts.length > 0
      ? `Connected: ${accounts.map((a) => `${a.email} (${a.provider})`).join(", ")}.`
      : "No mail account connected yet — mail_status will say so; ask the user to sign in via the Email app.";

  return [
    {
      name: "mail_status",
      description: `Check whether mail is connected and list accounts. ${accountHint}`,
      parameters: { type: "object", properties: {} },
      source: { kind: "system" },
      access: "read",
      execute: async (_args, toolCtx) => {
        try {
          const userId = resolveUserId(toolCtx);
          return {
            connected: mailGateway.listAccounts(userId).length > 0,
            accounts: mailGateway.listAccounts(userId),
            oauthAppConfigured: mailGateway.oauthConfigured(),
          };
        } catch (err) {
          return { connected: false, error: err instanceof Error ? err.message : "Mail unavailable" };
        }
      },
    },
    {
      name: "mail_list",
      description:
        `List recent mail threads from the user's connected inbox (or another folder). ` +
        `Use this when the user asks about email, unread mail, or something in their inbox — ` +
        `having the Email app open is not enough; call this tool. ${accountHint}`,
      parameters: {
        type: "object",
        properties: {
          folder: {
            type: "string",
            enum: ["inbox", "sent", "archive", "trash"],
            description: "Mailbox folder (default inbox)",
          },
          filter: {
            type: "string",
            enum: ["all", "unread", "starred"],
            description: "Optional filter",
          },
          query: { type: "string", description: "Optional search text (subject/from)" },
          accountId: { type: "string", description: "Optional mail account id from mail_status" },
        },
      },
      source: { kind: "system" },
      access: "read",
      execute: async (args, toolCtx) => {
        try {
          const userId = resolveUserId(toolCtx);
          if (mailGateway.listAccounts(userId).length === 0) {
            return {
              error:
                "No mail account connected. Ask the user to open Email and sign in (email + password, or Continue with Google).",
            };
          }
          const folderRaw = typeof args.folder === "string" ? args.folder : "inbox";
          const filterRaw = typeof args.filter === "string" ? args.filter : "all";
          const folder = (FOLDERS.has(folderRaw as MailFolderId) ? folderRaw : "inbox") as MailFolderId;
          const filter = (FILTERS.has(filterRaw as MailInboxFilter) ? filterRaw : "all") as MailInboxFilter;
          const threads = await mailGateway.listThreads(userId, {
            folder,
            filter,
            query: typeof args.query === "string" ? args.query : undefined,
            accountId: typeof args.accountId === "string" ? args.accountId : undefined,
          });
          return {
            folder,
            filter,
            count: threads.length,
            threads: threads.map((t) => ({
              id: t.id,
              from: t.senderName,
              subject: t.subject,
              preview: t.preview,
              timestamp: t.timestamp,
              unread: Boolean(t.unread),
              starred: Boolean(t.starred),
            })),
          };
        } catch (err) {
          return { error: err instanceof Error ? err.message : "Could not list mail" };
        }
      },
    },
    {
      name: "mail_read",
      description:
        "Read a mail thread/message by id (from mail_list). Returns plain text suitable for summarizing; HTML is converted.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Thread/message id from mail_list" },
          accountId: { type: "string" },
        },
        required: ["id"],
      },
      source: { kind: "system" },
      access: "read",
      execute: async (args, toolCtx) => {
        try {
          const userId = resolveUserId(toolCtx);
          const id = String(args.id ?? "");
          if (!id) return { error: "id is required" };
          const detail = await mailGateway.getThread(
            userId,
            id,
            typeof args.accountId === "string" ? args.accountId : undefined,
          );
          return {
            id,
            subject: detail.subject,
            messages: detail.messages.map((m) => ({
              id: m.id,
              from: m.senderName,
              timestamp: m.timestamp,
              body: clip(m.body),
              hasHtml: Boolean(m.htmlBody),
            })),
          };
        } catch (err) {
          return { error: err instanceof Error ? err.message : "Could not read mail" };
        }
      },
    },
    {
      name: "mail_send",
      description:
        "Send an email from the user's connected account. Confirm intent with the user before calling unless they explicitly asked to send.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string" },
          body: { type: "string", description: "Plain-text body" },
          accountId: { type: "string" },
        },
        required: ["to", "subject", "body"],
      },
      source: { kind: "system" },
      access: "write",
      execute: async (args, toolCtx) => {
        try {
          const userId = resolveUserId(toolCtx);
          const to = String(args.to ?? "").trim();
          const subject = String(args.subject ?? "").trim();
          const body = String(args.body ?? "");
          if (!to || !subject || !body.trim()) {
            return { error: "to, subject, and body are required" };
          }
          await mailGateway.send(
            userId,
            { to, subject, body },
            typeof args.accountId === "string" ? args.accountId : undefined,
          );
          return { ok: true, to, subject };
        } catch (err) {
          return { error: err instanceof Error ? err.message : "Send failed" };
        }
      },
    },
  ];
});
