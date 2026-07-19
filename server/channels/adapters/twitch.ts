/**
 * Twitch chat via IRC (irc.chat.twitch.tv:6697).
 * Requires a real login nick separate from the OAuth token (Twitch rejects NICK=token).
 */
import type { ChannelConfig } from "../../../shared/types.js";
import type { ChannelAdapter, InboundMessage } from "../gateway.js";
import { createIrcAdapter } from "./irc.js";
import { opt } from "./httpUtil.js";

export function createTwitchAdapter(
  cfg: ChannelConfig,
  onMessage: (msg: InboundMessage) => void,
): ChannelAdapter {
  const nick = opt(cfg, "nick").trim().toLowerCase();
  if (!nick) {
    throw new Error("Twitch requires options.nick (bot login, lowercase — not the OAuth token)");
  }
  const channel = opt(cfg, "channels").replace(/^#/, "").trim().toLowerCase();
  if (!channel) throw new Error("Twitch requires options.channels (channel login)");
  const oauth = cfg.token.startsWith("oauth:") ? cfg.token : `oauth:${cfg.token}`;
  const ircCfg: ChannelConfig = {
    ...cfg,
    token: nick,
    options: {
      ...cfg.options,
      host: "irc.chat.twitch.tv",
      port: "6697",
      tls: "true",
      password: oauth,
      channels: `#${channel}`,
    },
  };
  return createIrcAdapter(ircCfg, onMessage);
}
