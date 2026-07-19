/**
 * LINE reply tokens are single-use and expire in ~60s. We key them by
 * channel+peer so sessions keep a stable chatId (user/group/room id).
 */
const tokens = new Map<string, { token: string; at: number }>();

function key(channelId: string, peer: string): string {
  return `${channelId}:${peer}`;
}

export function rememberLineReplyToken(channelId: string, peer: string, replyToken: string): void {
  tokens.set(key(channelId, peer), { token: replyToken, at: Date.now() });
}

export function takeLineReplyToken(channelId: string, peer: string): string | undefined {
  const k = key(channelId, peer);
  const hit = tokens.get(k);
  tokens.delete(k);
  if (!hit) return undefined;
  if (Date.now() - hit.at > 55_000) return undefined;
  return hit.token;
}
