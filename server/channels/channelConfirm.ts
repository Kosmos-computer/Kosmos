/**
 * Channel confirmation bridge — maps confirm park ids to short codes and
 * delivery metadata so Slack Block Kit / `/approve CODE` can resolve the same
 * pending confirmation the shell ConfirmCard uses.
 */
import crypto from "node:crypto";
import type { ConfirmAnswer } from "../agent/confirmations.js";
import { resolveConfirmation } from "../agent/confirmations.js";

export interface ChannelConfirmDelivery {
  channelId: string;
  chatId: string;
  shortCode: string;
  confirmId: string;
  messageTs?: string;
}

const byConfirmId = new Map<string, ChannelConfirmDelivery>();
const byShortCode = new Map<string, string>(); // shortCode → confirmId

function mintShortCode(): string {
  // 6 hex chars — human-typed; not a security boundary (peer must be approved).
  let code = crypto.randomBytes(3).toString("hex").toUpperCase();
  while (byShortCode.has(code)) {
    code = crypto.randomBytes(3).toString("hex").toUpperCase();
  }
  return code;
}

export function registerChannelConfirm(meta: {
  confirmId: string;
  channelId: string;
  chatId: string;
}): ChannelConfirmDelivery {
  const shortCode = mintShortCode();
  const delivery: ChannelConfirmDelivery = {
    channelId: meta.channelId,
    chatId: meta.chatId,
    shortCode,
    confirmId: meta.confirmId,
  };
  byConfirmId.set(meta.confirmId, delivery);
  byShortCode.set(shortCode, meta.confirmId);
  return delivery;
}

export function attachConfirmMessageTs(confirmId: string, messageTs: string): void {
  const entry = byConfirmId.get(confirmId);
  if (entry) entry.messageTs = messageTs;
}

export function getChannelConfirm(confirmId: string): ChannelConfirmDelivery | undefined {
  return byConfirmId.get(confirmId);
}

export function lookupConfirmByShortCode(code: string): ChannelConfirmDelivery | undefined {
  const confirmId = byShortCode.get(code.trim().toUpperCase());
  if (!confirmId) return undefined;
  return byConfirmId.get(confirmId);
}

function forget(confirmId: string): ChannelConfirmDelivery | undefined {
  const entry = byConfirmId.get(confirmId);
  if (!entry) return undefined;
  byConfirmId.delete(confirmId);
  byShortCode.delete(entry.shortCode);
  return entry;
}

/** Resolve a pending confirmation from a channel; returns delivery meta if found. */
export function resolveChannelConfirm(
  confirmIdOrCode: string,
  answer: ConfirmAnswer,
): ChannelConfirmDelivery | null {
  const trimmed = confirmIdOrCode.trim();
  let confirmId = trimmed;
  let delivery = byConfirmId.get(confirmId);
  if (!delivery) {
    delivery = lookupConfirmByShortCode(trimmed);
    if (delivery) confirmId = delivery.confirmId;
  }
  if (!delivery) {
    // Still try resolve in case shell registered without channel meta
    const ok = resolveConfirmation(trimmed, answer);
    return ok ? { channelId: "", chatId: "", shortCode: "", confirmId: trimmed } : null;
  }
  const ok = resolveConfirmation(confirmId, answer);
  if (!ok) return null;
  forget(confirmId);
  return delivery;
}

/** Drop mapping when confirm times out or is resolved elsewhere. */
export function forgetChannelConfirm(confirmId: string): void {
  forget(confirmId);
}

/**
 * Parse `/approve CODE` or `/deny CODE` from inbound channel text.
 * Returns null when the message is not an approval command.
 */
export function parseApproveCommand(
  text: string,
): { approved: boolean; code: string } | null {
  const m = text.trim().match(/^\/(approve|deny)\s+([A-Za-z0-9-]+)\s*$/i);
  if (!m) return null;
  return { approved: m[1].toLowerCase() === "approve", code: m[2] };
}
