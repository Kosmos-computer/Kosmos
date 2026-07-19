/**
 * Generic webhook-backed channel — receives via pushWebhookInbound, sends via
 * kind-specific HTTP. Used for SMS, Synology, LINE, Nextcloud, Teams, Google Chat,
 * WeCom, Voice Call, and similar.
 */
import type { ChannelConfig } from "../../../shared/types.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { chunkText, jsonFetch, opt } from "./httpUtil.js";
import { takeLineReplyToken } from "./lineReplyCache.js";
import {
  decodeGoogleChatId,
  decodeTeamsChatId,
  mintGoogleChatToken,
  mintTeamsBotToken,
  parseGoogleServiceAccount,
} from "./oauthTokens.js";
import { findVoiceCallByChatId, voiceStreamSay } from "./voiceStream.js";
import { registerWebhookListener, unregisterWebhookListener } from "./webhookQueue.js";

export function createWebhookChannelAdapter(
  channelId: string,
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const kind = cfg.kind;

  return {
    async start() {
      registerWebhookListener(channelId, onMessage);
      return { botName: kind };
    },
    stop() {
      unregisterWebhookListener(channelId);
    },
    async send(chatId, text) {
      switch (kind) {
        case "sms": {
          const sid = opt(cfg, "accountSid");
          const from = opt(cfg, "fromNumber");
          if (!sid || !from) throw new Error("SMS requires accountSid and fromNumber");
          const body = new URLSearchParams({ To: chatId, From: from, Body: text.slice(0, 1500) });
          await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: "Basic " + Buffer.from(`${sid}:${cfg.token}`).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body,
            },
          ).then(async (r) => {
            if (!r.ok) throw new Error(`Twilio SMS ${r.status}: ${await r.text()}`);
          });
          return;
        }
        case "synologychat": {
          const url = opt(cfg, "baseUrl");
          if (!url) throw new Error("Synology Chat requires incoming webhook URL");
          const userId = Number(chatId);
          const payload: { text: string; user_ids?: number[] } = {
            text: text.slice(0, 2000),
          };
          if (Number.isFinite(userId)) payload.user_ids = [userId];
          await jsonFetch(url, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          return;
        }
        case "line": {
          const messages = chunkText(text, 4000).map((t) => ({ type: "text", text: t }));
          const replyToken = takeLineReplyToken(channelId, chatId);
          if (replyToken) {
            await jsonFetch("https://api.line.me/v2/bot/message/reply", {
              method: "POST",
              headers: { Authorization: `Bearer ${cfg.token}` },
              body: JSON.stringify({ replyToken, messages }),
            });
            return;
          }
          await jsonFetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: { Authorization: `Bearer ${cfg.token}` },
            body: JSON.stringify({ to: chatId, messages }),
          });
          return;
        }
        case "nextcloudtalk": {
          const base = opt(cfg, "baseUrl").replace(/\/+$/, "");
          await jsonFetch(`${base}/ocs/v2.php/apps/spreed/api/v1/chat/${encodeURIComponent(chatId)}`, {
            method: "POST",
            headers: {
              "OCS-APIRequest": "true",
              Authorization: `Bearer ${cfg.token}`,
            },
            body: JSON.stringify({ message: text.slice(0, 4000) }),
          });
          return;
        }
        case "msteams": {
          const appId = opt(cfg, "appId");
          if (!appId) throw new Error("Teams requires options.appId");
          const ref =
            decodeTeamsChatId(chatId) ??
            (opt(cfg, "serviceUrl")
              ? {
                  serviceUrl: opt(cfg, "serviceUrl"),
                  conversationId: chatId,
                  tenantId: opt(cfg, "tenantId") || undefined,
                }
              : null);
          if (!ref?.serviceUrl || !ref.conversationId) {
            throw new Error("Teams reply needs conversation ref from inbound activity");
          }
          const bearer = await mintTeamsBotToken({
            appId,
            appPassword: cfg.token,
            tenantId: ref.tenantId || opt(cfg, "tenantId") || undefined,
          });
          const tenantId = ref.tenantId || opt(cfg, "tenantId");
          await jsonFetch(
            `${ref.serviceUrl.replace(/\/+$/, "")}/v3/conversations/${encodeURIComponent(ref.conversationId)}/activities`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${bearer}` },
              body: JSON.stringify({
                type: "message",
                text,
                channelId: "msteams",
                ...(ref.botId ? { from: { id: ref.botId, role: "bot" } } : {}),
                ...(ref.userId
                  ? { recipient: { id: ref.userId, name: ref.userName } }
                  : {}),
                conversation: {
                  id: ref.conversationId,
                  ...(ref.conversationType ? { conversationType: ref.conversationType } : {}),
                  ...(tenantId ? { tenantId } : {}),
                },
                ...(tenantId
                  ? { tenantId, channelData: { tenant: { id: tenantId } } }
                  : {}),
              }),
            },
          );
          return;
        }
        case "googlechat": {
          const sa = parseGoogleServiceAccount(cfg.token);
          const bearer = await mintGoogleChatToken(sa);
          const { space, thread } = decodeGoogleChatId(chatId);
          const url = new URL(`https://chat.googleapis.com/v1/${space}/messages`);
          const body: Record<string, unknown> = { text: text.slice(0, 4000) };
          if (thread) {
            body.thread = { name: thread };
            url.searchParams.set(
              "messageReplyOption",
              "REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD",
            );
          }
          await jsonFetch(url.toString(), {
            method: "POST",
            headers: { Authorization: `Bearer ${bearer}` },
            body: JSON.stringify(body),
          });
          return;
        }
        case "wecom": {
          const corpId = opt(cfg, "appId");
          const agentId = opt(cfg, "agentId");
          const tokenRes = await jsonFetch<{ access_token: string }>(
            `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(cfg.token)}`,
          );
          await jsonFetch(
            `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${tokenRes.access_token}`,
            {
              method: "POST",
              body: JSON.stringify({
                touser: chatId,
                msgtype: "text",
                agentid: Number(agentId) || agentId,
                text: { content: text.slice(0, 2000) },
              }),
            },
          );
          return;
        }
        case "voicecall": {
          const sid = opt(cfg, "accountSid");
          const active = findVoiceCallByChatId(chatId);
          if (sid && (active?.callSid || chatId.startsWith("CA"))) {
            await voiceStreamSay(
              active?.callSid || chatId,
              sid,
              cfg.token,
              text,
            );
            return;
          }
          const from = opt(cfg, "fromNumber");
          if (sid && from) {
            const body = new URLSearchParams({
              To: chatId,
              From: from,
              Body: text.slice(0, 1500),
            });
            await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  Authorization:
                    "Basic " + Buffer.from(`${sid}:${cfg.token}`).toString("base64"),
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body,
              },
            );
            return;
          }
          console.log(`[voicecall] reply to ${chatId}: ${text.slice(0, 200)}`);
          return;
        }
        default:
          throw new Error(`Webhook send not implemented for ${kind}`);
      }
    },
    async indicateTyping() {},
  };
}
