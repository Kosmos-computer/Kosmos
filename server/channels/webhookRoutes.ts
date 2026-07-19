/**
 * Public webhook ingress for channels that cannot long-poll / Socket Mode.
 * Path: /api/channels/webhook/:kind/:id
 *
 * Payload shapes follow OpenClaw extensions where applicable (LINE groupId,
 * Synology token+user_id, Bot Framework activity, Feishu challenge, etc.).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { isChannelKind } from "../../shared/channelCatalog.js";
import { channelStore } from "./channelStore.js";
import { rememberLineReplyToken } from "./adapters/lineReplyCache.js";
import {
  encodeGoogleChatId,
  encodeTeamsChatId,
  validateTwilioSignature,
  verifyGoogleChatInboundJwt,
} from "./adapters/oauthTokens.js";
import { verifyTeamsInboundJwt } from "./adapters/teamsJwt.js";
import {
  buildVoiceStreamTwiml,
  mintVoiceStreamToken,
} from "./adapters/voiceStream.js";
import { pushWebhookInbound } from "./adapters/webhookQueue.js";
import { opt } from "./adapters/httpUtil.js";

export const channelWebhookRoutes = new Hono();

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function formToStrings(form: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(form)) {
    if (typeof v === "string") out[k] = v;
    else if (typeof v === "number" || typeof v === "boolean") out[k] = String(v);
  }
  return out;
}

channelWebhookRoutes.post("/:kind/:id", async (c) => {
  const kind = c.req.param("kind");
  const id = c.req.param("id");
  if (!isChannelKind(kind)) return c.json({ error: "unknown kind" }, 400);
  const cfg = channelStore.get(id);
  if (!cfg || cfg.kind !== kind || !cfg.enabled) {
    return c.json({ error: "channel not found" }, 404);
  }

  const contentType = c.req.header("content-type") ?? "";

  try {
    if (kind === "sms") {
      const form = await c.req.parseBody();
      const params = formToStrings(form as Record<string, unknown>);
      const webhookUrl =
        opt(cfg, "webhookUrl") ||
        `${c.req.header("x-forwarded-proto") || "https"}://${c.req.header("x-forwarded-host") || c.req.header("host") || "localhost"}${c.req.path}`;
      const sig = c.req.header("x-twilio-signature") ?? "";
      if (opt(cfg, "skipSignature") !== "true") {
        if (!opt(cfg, "webhookUrl")) {
          console.warn(
            "[sms] set options.webhookUrl to the exact public Twilio callback URL for signature checks",
          );
        }
        if (!validateTwilioSignature(cfg.token, sig, webhookUrl, params)) {
          return c.json({ error: "invalid Twilio signature" }, 401);
        }
      }
      const from = params.From ?? "";
      const body = (params.Body ?? "").trim();
      if (from && body) {
        pushWebhookInbound(id, {
          chatId: from,
          label: from,
          text: body,
          isGroup: false,
          mentioned: true,
        });
      }
      return c.text("<Response></Response>", 200, { "Content-Type": "text/xml" });
    }

    if (kind === "line") {
      const raw = await c.req.text();
      const secret = cfg.appToken?.trim();
      if (secret) {
        const sig = c.req.header("x-line-signature") ?? "";
        const expected = createHmac("sha256", secret).update(raw).digest("base64");
        if (!sig || !safeEqual(sig, expected)) {
          return c.json({ error: "invalid signature" }, 401);
        }
      }
      const body = JSON.parse(raw) as {
        events?: Array<{
          type?: string;
          source?: {
            userId?: string;
            groupId?: string;
            roomId?: string;
            type?: string;
          };
          message?: { type?: string; text?: string };
          replyToken?: string;
        }>;
      };
      for (const ev of body.events ?? []) {
        if (ev.type !== "message" || ev.message?.type !== "text") continue;
        const sourceType = ev.source?.type ?? "user";
        const peer =
          sourceType === "group"
            ? ev.source?.groupId
            : sourceType === "room"
              ? ev.source?.roomId
              : ev.source?.userId;
        const text = ev.message.text?.trim();
        if (!peer || !text) continue;
        if (ev.replyToken) rememberLineReplyToken(id, peer, ev.replyToken);
        pushWebhookInbound(id, {
          chatId: peer,
          label: ev.source?.userId ?? peer,
          text,
          isGroup: sourceType === "group" || sourceType === "room",
          mentioned: true,
        });
      }
      return c.json({ ok: true });
    }

    if (kind === "synologychat") {
      let token = "";
      let userId = "";
      let username = "";
      let text = "";
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const form = await c.req.parseBody();
        token = String(form.token ?? "");
        userId = String(form.user_id ?? "");
        username = String(form.username ?? "");
        text = String(form.text ?? "").trim();
      } else {
        const body = (await c.req.json()) as {
          token?: string;
          user_id?: string | number;
          username?: string;
          text?: string;
        };
        token = String(body.token ?? "");
        userId = String(body.user_id ?? "");
        username = body.username ?? "";
        text = (body.text ?? "").trim();
      }
      if (!token || !safeEqual(token, cfg.token)) {
        return c.json({ error: "invalid token" }, 401);
      }
      if (userId && text) {
        pushWebhookInbound(id, {
          chatId: userId,
          label: username || userId,
          text,
          isGroup: false,
          mentioned: true,
        });
      }
      return c.json({ ok: true });
    }

    if (kind === "feishu") {
      const body = (await c.req.json()) as {
        challenge?: string;
        type?: string;
        header?: { event_type?: string };
        event?: {
          message?: {
            chat_id?: string;
            chat_type?: string;
            content?: string;
            message_type?: string;
          };
          sender?: { sender_id?: { open_id?: string; user_id?: string } };
        };
      };
      if (body.challenge && (body.type === "url_verification" || !body.event)) {
        return c.json({ challenge: body.challenge });
      }
      const msg = body.event?.message;
      if (msg?.chat_id && msg.message_type === "text" && msg.content) {
        let text = "";
        try {
          const parsed = JSON.parse(msg.content) as { text?: string };
          text = (parsed.text ?? "").trim();
        } catch {
          text = msg.content.trim();
        }
        if (text) {
          pushWebhookInbound(id, {
            chatId: msg.chat_id,
            label:
              body.event?.sender?.sender_id?.open_id ??
              body.event?.sender?.sender_id?.user_id ??
              msg.chat_id,
            text,
            isGroup: msg.chat_type !== "p2p",
            mentioned: true,
          });
        }
      }
      return c.json({ ok: true });
    }

    if (kind === "msteams") {
      const appId = opt(cfg, "appId");
      const auth = c.req.header("authorization") ?? "";
      if (appId && opt(cfg, "skipAuth") !== "true") {
        const verified = await verifyTeamsInboundJwt(auth, appId);
        if (!verified.ok) {
          return c.json({ error: verified.reason ?? "unauthorized" }, 401);
        }
      }
      const activity = (await c.req.json()) as {
        type?: string;
        text?: string;
        from?: { id?: string; name?: string; aadObjectId?: string };
        conversation?: { id?: string; conversationType?: string; tenantId?: string };
        serviceUrl?: string;
        recipient?: { id?: string; name?: string };
        channelData?: { tenant?: { id?: string } };
      };
      if (activity.type === "message" && activity.text?.trim() && activity.conversation?.id) {
        const serviceUrl = (activity.serviceUrl || opt(cfg, "serviceUrl") || "").replace(/\/+$/, "");
        if (!serviceUrl) {
          return c.json({ error: "activity missing serviceUrl" }, 400);
        }
        const tenantId =
          activity.channelData?.tenant?.id ||
          activity.conversation.tenantId ||
          opt(cfg, "tenantId") ||
          undefined;
        const chatId = encodeTeamsChatId({
          serviceUrl,
          conversationId: activity.conversation.id,
          tenantId,
          botId: activity.recipient?.id,
          userId: activity.from?.id,
          userName: activity.from?.name,
          conversationType: activity.conversation.conversationType,
        });
        pushWebhookInbound(id, {
          chatId,
          label: activity.from?.name ?? activity.from?.id ?? "teams",
          text: activity.text.trim(),
          isGroup: activity.conversation.conversationType !== "personal",
          mentioned: true,
        });
      }
      return c.json({ ok: true });
    }

    if (kind === "voicecall") {
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const form = await c.req.parseBody();
        const from = String(form.From ?? form.Caller ?? "voice");
        const callSid = String(form.CallSid ?? "");
        const text = String(form.SpeechResult ?? form.Digits ?? form.Body ?? "").trim();
        const mode = opt(cfg, "mode", "gather");
        const publicWs = opt(cfg, "streamUrl") || opt(cfg, "publicWsUrl");

        if (mode === "stream" && publicWs && callSid) {
          const token = mintVoiceStreamToken({
            channelId: id,
            callSid,
            from,
            authToken: cfg.token,
            accountSid: opt(cfg, "accountSid"),
          });
          return c.text(buildVoiceStreamTwiml(publicWs, token), 200, {
            "Content-Type": "text/xml",
          });
        }

        if (text) {
          pushWebhookInbound(id, {
            chatId: callSid || from,
            label: from,
            text,
            isGroup: false,
            mentioned: true,
          });
        }
        return c.text(
          `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Got it. Working on that.</Say><Gather input="speech dtmf" timeout="5" speechTimeout="auto"><Say>Anything else?</Say></Gather></Response>`,
          200,
          { "Content-Type": "text/xml" },
        );
      }
    }

    // Google Chat: verify JWT before parsing body when audience is configured.
    if (kind === "googlechat") {
      const audience = opt(cfg, "audience") || opt(cfg, "webhookUrl");
      const auth = c.req.header("authorization") ?? "";
      if (audience && opt(cfg, "skipAuth") !== "true") {
        const ok = await verifyGoogleChatInboundJwt(auth, audience);
        if (!ok) return c.json({ error: "invalid Google Chat JWT" }, 401);
      }
      const body = (await c.req.json()) as {
        message?: {
          text?: string;
          sender?: { name?: string; displayName?: string };
          thread?: { name?: string };
        };
        space?: { name?: string; type?: string };
      };
      if (body.message?.text && body.space?.name) {
        const chatId = encodeGoogleChatId(body.space.name, body.message.thread?.name);
        pushWebhookInbound(id, {
          chatId,
          label: body.message.sender?.displayName ?? body.message.sender?.name ?? "user",
          text: body.message.text.trim(),
          isGroup: body.space.type !== "DM",
          mentioned: true,
        });
      }
      return c.json({ ok: true });
    }

    const body = (await c.req.json()) as {
      chatId?: string;
      text?: string;
      label?: string;
      isGroup?: boolean;
      object?: { id?: string; content?: string; actorType?: string; actorDisplayName?: string };
    };

    if (kind === "nextcloudtalk" && body.object?.content) {
      pushWebhookInbound(id, {
        chatId: String(body.object.id ?? "talk"),
        label: body.object.actorDisplayName ?? "user",
        text: body.object.content.replace(/<[^>]+>/g, "").trim(),
        isGroup: true,
        mentioned: true,
      });
      return c.json({ ok: true });
    }

    if (body.chatId && body.text) {
      pushWebhookInbound(id, {
        chatId: body.chatId,
        label: body.label ?? body.chatId,
        text: body.text.trim(),
        isGroup: Boolean(body.isGroup),
        mentioned: true,
      });
    }
    return c.json({ ok: true });
  } catch (err) {
    console.warn("[channels/webhook]", err);
    return c.json({ error: err instanceof Error ? err.message : "bad request" }, 400);
  }
});
