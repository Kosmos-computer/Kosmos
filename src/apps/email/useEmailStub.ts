import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_THREAD_ID,
  EMAIL_MESSAGES,
  EMAIL_THREADS,
  MAIL_FOLDERS,
} from "./emailMock";
import type { EmailInboxFilter } from "./types";

/** STUB: replace with useEmailStore when os.mail@1 exists. */
export function useEmailStub() {
  const [activeThreadId, setActiveThreadId] = useState(DEFAULT_THREAD_ID);
  const [starred, setStarred] = useState<Set<string>>(() => new Set(["t1"]));
  const [searchQuery, setSearchQuery] = useState("");
  const [inboxFilter, setInboxFilter] = useState<EmailInboxFilter>("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [listWidth, setListWidth] = useState(360);
  const [activeFolderId, setActiveFolderId] = useState("inbox");

  const threads = useMemo(
    () => EMAIL_THREADS.map((thread) => ({ ...thread, starred: starred.has(thread.id) })),
    [starred],
  );

  const filteredThreads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return threads.filter((thread) => {
      if (inboxFilter === "unread" && !thread.unread) return false;
      if (inboxFilter === "starred" && !thread.starred) return false;
      if (!query) return true;
      return (
        thread.senderName.toLowerCase().includes(query) ||
        thread.subject.toLowerCase().includes(query) ||
        thread.preview.toLowerCase().includes(query)
      );
    });
  }, [threads, searchQuery, inboxFilter]);

  const activeThread = threads.find((thread) => thread.id === activeThreadId);
  const activeDetail = EMAIL_MESSAGES[activeThreadId];

  const toggleStar = useCallback((id: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const unreadCount = threads.filter((thread) => thread.unread).length;

  return {
    folders: MAIL_FOLDERS.map((folder) => ({ ...folder, active: folder.id === activeFolderId })),
    activeFolderId,
    setActiveFolderId,
    threads: filteredThreads,
    allThreads: threads,
    activeThreadId,
    setActiveThreadId,
    activeThread,
    activeSubject: activeDetail?.subject ?? activeThread?.subject,
    activeMessages: activeDetail?.messages ?? [],
    searchQuery,
    setSearchQuery,
    inboxFilter,
    setInboxFilter,
    unreadCount,
    starredCount: threads.filter((thread) => thread.starred).length,
    toggleStar,
    composeOpen,
    setComposeOpen,
    sidebarWidth,
    setSidebarWidth,
    listWidth,
    setListWidth,
  };
}

export type EmailViewModel = ReturnType<typeof useEmailStub>;
