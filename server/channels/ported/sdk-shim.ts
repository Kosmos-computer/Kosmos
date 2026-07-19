/**
 * Minimal stand-ins for openclaw/plugin-sdk helpers used by ported transport code.
 */
export function resolveTimerTimeoutMs(ms: number, fallback = 30_000): number {
  if (!Number.isFinite(ms) || ms <= 0) return fallback;
  return Math.min(Math.max(ms, 1), 600_000);
}

export async function readProviderJsonResponse<T>(
  response: Response,
  label = "provider",
  _opts?: { maxBytes?: number },
): Promise<T> {
  const text = await response.text();
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}: ${text.slice(0, 200)}`);
  try {
    return (text ? JSON.parse(text) : null) as T;
  } catch {
    throw new Error(`${label} invalid JSON`);
  }
}

export async function readResponseTextLimited(
  response: Response,
  maxBytes = 1024 * 1024,
): Promise<string> {
  const text = await response.text();
  if (text.length > maxBytes) throw new Error("response too large");
  return text;
}

export function formatErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function normalizeLowercaseStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function resolveUserPath(p: string): string {
  if (p.startsWith("~/")) {
    return `${process.env.HOME ?? ""}${p.slice(1)}`;
  }
  return p;
}

export type RuntimeEnv = {
  log?: (msg: string) => void;
  error?: (msg: string) => void;
};
export type SsrFPolicy = Record<string, unknown>;
export type LookupFn = typeof import("node:dns/promises").lookup;

export async function resolvePinnedHostnameWithPolicy(
  hostname: string,
  _policy?: SsrFPolicy,
): Promise<{ hostname: string }> {
  return { hostname };
}

export function isBlockedHostnameOrIp(_host: string): boolean {
  return false;
}

export function ssrfPolicyFromDangerouslyAllowPrivateNetwork(): SsrFPolicy {
  return {};
}

export async function fetchWithSsrFGuard(params: {
  url: string;
  init?: RequestInit;
}): Promise<Response> {
  return fetch(params.url, params.init);
}

export function createLazyRuntimeModule<T>(loader: () => Promise<T>): {
  load: () => Promise<T>;
} {
  let cached: Promise<T> | null = null;
  return {
    load: () => {
      cached ??= loader();
      return cached;
    },
  };
}

export function expectDefined<T>(value: T | null | undefined, msg = "expected value"): T {
  if (value == null) throw new Error(msg);
  return value;
}

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export async function readRemoteMediaBuffer(_url: string): Promise<Buffer> {
  throw new Error("remote media not supported in Kosmos shim");
}

export function chunkTextForOutbound(text: string, max = 4000): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += max) out.push(text.slice(i, i + max));
  return out.length ? out : [""];
}

/** Loose OpenClaw config stand-in for ported extension modules. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OpenClawConfig = Record<string, any>;

export const DEFAULT_ACCOUNT_ID = "default";
export const MAX_TIMER_TIMEOUT_MS = 600_000;

export function normalizeAccountId(id?: string | null): string {
  return (id ?? DEFAULT_ACCOUNT_ID).trim() || DEFAULT_ACCOUNT_ID;
}

export function listCombinedAccountIds(_cfg?: OpenClawConfig, _channel?: string): string[] {
  return [DEFAULT_ACCOUNT_ID];
}

export function resolveMergedAccountConfig(
  _cfg: OpenClawConfig,
  _channel: string,
  _accountId?: string,
): Record<string, unknown> {
  return {};
}

export function hasLegacyFlatAllowPrivateNetworkAlias(): boolean {
  return false;
}

export function isPrivateNetworkOptInEnabled(): boolean {
  return false;
}

export function requireRuntimeConfig(): OpenClawConfig {
  return {};
}

export function normalizeE164(value: string): string {
  return value.trim();
}

export function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function runCommandWithTimeout(
  _cmd: string,
  _args: string[],
  _opts?: { timeoutMs?: number },
): Promise<{ stdout: string; stderr: string; code: number }> {
  throw new Error("runCommandWithTimeout not available in Kosmos shim");
}

export class SsrFBlockedError extends Error {
  constructor(message = "SSRF blocked") {
    super(message);
    this.name = "SsrFBlockedError";
  }
}

export type MessageReceiptPartKind = string;
export function createMessageReceiptFromOutboundResults(
  _results: unknown[],
): Record<string, unknown> {
  return {};
}

/** Voice realtime stubs — Kosmos uses adapters/voiceStream.ts instead. */
export type RealtimeTranscriptionProviderConfig = Record<string, unknown>;
export type RealtimeTranscriptionProviderPlugin = Record<string, unknown>;
export type RealtimeTranscriptionSession = Record<string, unknown>;
export function createTalkSessionController(): { stop: () => void } {
  return { stop() {} };
}
export function recordTalkObservabilityEvent(_event: unknown): void {}
export type TalkEvent = Record<string, unknown>;
export type TalkEventInput = Record<string, unknown>;
export type TalkSessionController = { stop: () => void };
export function truncateUtf16Safe(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max);
}
