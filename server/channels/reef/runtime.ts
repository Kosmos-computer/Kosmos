/**
 * Live Reef handles — friend manager registry for Settings/API.
 */
import type { ReefFriendManager } from "./friends.js";

const byChannel = new Map<string, ReefFriendManager>();

export function registerReefFriends(channelId: string, manager: ReefFriendManager): void {
  byChannel.set(channelId, manager);
}

export function unregisterReefFriends(channelId: string): void {
  byChannel.delete(channelId);
}

export function getReefFriends(channelId: string): ReefFriendManager | undefined {
  return byChannel.get(channelId);
}
