/**
 * STUB: Messenger workspace — reads shared store for threads/popouts; local UI
 * state for inbox chrome. Wire point: swap store actions for real adapters.
 */
import { useCallback, useMemo, useState } from "react";
import { useConnectionStore } from "../../connections/useConnectionStore";
import { MESSENGER_CONTACTS } from "./messengerMock";
import { useMessengerStore } from "./messengerStore";

export type MessengerView = "hub" | "inbox";

export function useMessengerStub() {
  const connections = useConnectionStore((s) => s.connectionsForDomain("social"));
  const addConnection = useConnectionStore((s) => s.addConnection);
  const connectionsAll = useConnectionStore((s) => s.connections);

  const activeContactId = useMessengerStore((s) => s.activeContactId);
  const setActiveContactId = useMessengerStore((s) => s.setActiveContactId);
  const sessions = useMessengerStore((s) => s.sessions);
  const messages = useMessengerStore((s) => s.messages);
  const composerByContact = useMessengerStore((s) => s.composerByContact);
  const openPopout = useMessengerStore((s) => s.openPopout);
  const minimizePopout = useMessengerStore((s) => s.minimizePopout);
  const expandPopout = useMessengerStore((s) => s.expandPopout);
  const closePopout = useMessengerStore((s) => s.closePopout);
  const setComposerForContact = useMessengerStore((s) => s.setComposerForContact);
  const handleSubmit = useMessengerStore((s) => s.handleSubmit);
  const restoreMessengerWindow = useMessengerStore((s) => s.restoreMessengerWindow);

  const [view, setView] = useState<MessengerView>("hub");
  const [connectOpen, setConnectOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [searchQuery, setSearchQuery] = useState("");

  const hasConnection = connections.length > 0;
  const contacts = MESSENGER_CONTACTS;

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.lastMessage?.toLowerCase().includes(query),
    );
  }, [contacts, searchQuery]);

  const { unreadContacts, readContacts } = useMemo(() => {
    const unread = filteredContacts.filter((c) => (c.unreadCount ?? 0) > 0);
    const read = filteredContacts.filter((c) => (c.unreadCount ?? 0) === 0);
    return { unreadContacts: unread, readContacts: read };
  }, [filteredContacts]);

  const activeContact = contacts.find((c) => c.id === activeContactId);
  const threadMessages = messages[activeContactId] ?? [];
  const composerValue = composerByContact[activeContactId] ?? "";

  const setComposerValue = useCallback(
    (value: string) => setComposerForContact(activeContactId, value),
    [activeContactId, setComposerForContact],
  );

  const composerForContact = useCallback(
    (contactId: string) => composerByContact[contactId] ?? "",
    [composerByContact],
  );

  const popoutContacts = useMemo(
    () =>
      sessions
        .map((session) => contacts.find((c) => c.id === session.contactId))
        .filter((c): c is (typeof contacts)[number] => Boolean(c)),
    [contacts, sessions],
  );

  const submitActive = useCallback(() => handleSubmit(activeContactId), [activeContactId, handleSubmit]);

  return {
    view,
    setView,
    contacts,
    filteredContacts,
    unreadContacts,
    readContacts,
    activeContactId,
    setActiveContactId,
    activeContact,
    threadMessages,
    composerValue,
    setComposerValue,
    composerForContact,
    setComposerForContact,
    messages,
    handleSubmit,
    sessions,
    popoutContacts,
    openPopout,
    closePopout,
    minimizePopout,
    expandPopout,
    hasConnection,
    connections,
    connectionsAll,
    connectOpen,
    setConnectOpen,
    addConnection,
    sidebarWidth,
    setSidebarWidth,
    searchQuery,
    setSearchQuery,
    restoreMessengerWindow,
    submitActive,
  };
}

export type MessengerViewModel = ReturnType<typeof useMessengerStub>;
