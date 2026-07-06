import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import type { MailAccountInfo } from "@shared/mail";
import { MAIL_FOLDERS } from "./emailMock";
import type { EmailInboxFilter } from "./types";

/** Live Gmail proxy via /api/mail — replaces useEmailStub once connected. */
export function useEmail() {
  const [accounts, setAccounts] = useState<MailAccountInfo[]>([]);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inboxFilter, setInboxFilter] = useState<EmailInboxFilter>("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [listWidth, setListWidth] = useState(360);
  const [activeFolderId, setActiveFolderId] = useState("inbox");
  const [threads, setThreads] = useState<
    {
      id: string;
      senderName: string;
      subject: string;
      preview: string;
      timestamp: string;
      unread?: boolean;
      starred?: boolean;
    }[]
  >([]);
  const [activeSubject, setActiveSubject] = useState<string | undefined>();
  const [activeMessages, setActiveMessages] = useState<
    { id: string; senderName: string; timestamp: string; body: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  const connectedAccount = accounts[0];
  const isConnected = Boolean(connectedAccount);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await api.mailStatus();
      setOauthConfigured(status.oauthConfigured);
      setAccounts(status.accounts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load mail status");
    }
  }, []);

  const refreshThreads = useCallback(async () => {
    if (!connectedAccount) {
      setThreads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await api.listMailThreads({
        folder: activeFolderId as "inbox" | "sent" | "archive" | "trash",
        filter: inboxFilter,
        q: searchQuery.trim() || undefined,
        accountId: connectedAccount.id,
      });
      setThreads(next);
      setError(null);
      if (next.length === 0) {
        setActiveThreadId(null);
        setActiveSubject(undefined);
        setActiveMessages([]);
      } else if (!activeThreadId || !next.some((thread) => thread.id === activeThreadId)) {
        setActiveThreadId(next[0]?.id ?? null);
      }
    } catch (err) {
      setThreads([]);
      setError(err instanceof Error ? err.message : "Could not load mail");
    } finally {
      setLoading(false);
    }
  }, [activeFolderId, activeThreadId, connectedAccount, inboxFilter, searchQuery]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    if (!connectedAccount || !activeThreadId) {
      setActiveSubject(undefined);
      setActiveMessages([]);
      return;
    }
    let cancelled = false;
    void api
      .getMailThread(activeThreadId, connectedAccount.id)
      .then((detail) => {
        if (cancelled) return;
        setActiveSubject(detail.subject);
        setActiveMessages(detail.messages);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setActiveSubject(undefined);
        setActiveMessages([]);
        setError(err instanceof Error ? err.message : "Could not load message");
      });
    return () => {
      cancelled = true;
    };
  }, [activeThreadId, connectedAccount]);

  const toggleStar = useCallback(
    async (id: string) => {
      if (!connectedAccount) return;
      const thread = threads.find((entry) => entry.id === id);
      const starred = !thread?.starred;
      setThreads((prev) =>
        prev.map((entry) => (entry.id === id ? { ...entry, starred } : entry)),
      );
      try {
        await api.starMailThread(id, starred, connectedAccount.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update star");
        void refreshThreads();
      }
    },
    [connectedAccount, refreshThreads, threads],
  );

  const sendCompose = useCallback(async () => {
    if (!connectedAccount) return;
    setSending(true);
    try {
      await api.sendMail({
        to: composeTo,
        subject: composeSubject,
        body: composeBody,
        accountId: connectedAccount.id,
      });
      setComposeOpen(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      if (activeFolderId !== "sent") setActiveFolderId("sent");
      else void refreshThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }, [
    activeFolderId,
    composeBody,
    composeSubject,
    composeTo,
    connectedAccount,
    refreshThreads,
  ]);

  const disconnect = useCallback(async () => {
    if (!connectedAccount) return;
    try {
      await api.disconnectMailAccount(connectedAccount.id);
      setAccounts([]);
      setThreads([]);
      setActiveThreadId(null);
      setActiveSubject(undefined);
      setActiveMessages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect");
    }
  }, [connectedAccount]);

  const unreadCount = threads.filter((thread) => thread.unread).length;
  const starredCount = threads.filter((thread) => thread.starred).length;
  const activeThread = threads.find((thread) => thread.id === activeThreadId);

  const folders = useMemo(
    () => MAIL_FOLDERS.map((folder) => ({ ...folder, active: folder.id === activeFolderId })),
    [activeFolderId],
  );

  return {
    accounts,
    connectedAccount,
    isConnected,
    oauthConfigured,
    folders,
    activeFolderId,
    setActiveFolderId,
    threads,
    activeThreadId,
    setActiveThreadId,
    activeThread,
    activeSubject: activeSubject ?? activeThread?.subject,
    activeMessages,
    searchQuery,
    setSearchQuery,
    inboxFilter,
    setInboxFilter,
    unreadCount,
    starredCount,
    toggleStar,
    composeOpen,
    setComposeOpen,
    composeTo,
    setComposeTo,
    composeSubject,
    setComposeSubject,
    composeBody,
    setComposeBody,
    sendCompose,
    sending,
    sidebarWidth,
    setSidebarWidth,
    listWidth,
    setListWidth,
    loading,
    error,
    connectGmail: api.connectGmail,
    disconnect,
    refreshStatus,
    refreshThreads,
  };
}

export type EmailViewModel = ReturnType<typeof useEmail>;
