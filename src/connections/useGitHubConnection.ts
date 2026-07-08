/**
 * GitHub OAuth connection state — mirrors useEmail for the Gmail connect flow.
 */
import { useCallback, useEffect, useState } from "react";
import type { GitHubAccountInfo } from "@shared/github";
import { api } from "../lib/api";

export interface GitHubConnectionState {
  loading: boolean;
  oauthConfigured: boolean;
  account: GitHubAccountInfo | undefined;
  isConnected: boolean;
  oauthError: string | null;
  refresh: () => Promise<void>;
  connect: () => void;
  disconnect: () => Promise<void>;
}

/** Strip ?githubConnected / ?githubError from the URL after OAuth redirect. */
let cachedOAuthReturn: { connected: boolean; error: string | null } | null = null;

export function consumeGitHubOAuthReturn(): { connected: boolean; error: string | null } {
  if (cachedOAuthReturn) return cachedOAuthReturn;

  const params = new URLSearchParams(window.location.search);
  const error = params.get("githubError");
  const connected = params.has("githubConnected");
  if (!connected && !error) {
    cachedOAuthReturn = { connected: false, error: null };
    return cachedOAuthReturn;
  }

  params.delete("githubConnected");
  params.delete("githubError");
  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState({}, "", next);
  cachedOAuthReturn = { connected, error: error ? decodeURIComponent(error) : null };
  return cachedOAuthReturn;
}

export function useGitHubConnection(): GitHubConnectionState {
  const [loading, setLoading] = useState(true);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [account, setAccount] = useState<GitHubAccountInfo | undefined>(undefined);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const status = await api.githubStatus();
      setOauthConfigured(status.oauthConfigured);
      setAccount(status.accounts[0]);
      setOauthError(null);
    } catch (err) {
      setOauthError(err instanceof Error ? err.message : "Could not load GitHub status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const { connected, error } = consumeGitHubOAuthReturn();
    if (connected) void refresh();
    if (error) setOauthError(error);
  }, [refresh]);

  const connect = useCallback(() => {
    api.connectGitHub();
  }, []);

  const disconnect = useCallback(async () => {
    if (!account) return;
    await api.disconnectGitHubAccount(account.id);
    await refresh();
  }, [account, refresh]);

  return {
    loading,
    oauthConfigured,
    account,
    isConnected: Boolean(account),
    oauthError,
    refresh,
    connect,
    disconnect,
  };
}
