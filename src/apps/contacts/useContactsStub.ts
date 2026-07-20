import { useCallback, useEffect, useMemo, useState } from "react";
import { listServerProfiles } from "../../os/server/serverProfileStore";
import { useOsStore } from "../../os/osStore";
import {
  LOCAL_CONTACTS_BACKEND_ID,
  serverProfileIdFromContactsBackend,
} from "./contactsMock";
import { useContactsStore } from "./contactsStore";
import type { ContactImportMode, ContactInput } from "./types";

function backendDisplayLabel(backendId: string): string {
  if (backendId === LOCAL_CONTACTS_BACKEND_ID) return "Local";
  const profileId = serverProfileIdFromContactsBackend(backendId);
  if (!profileId) return "Contacts";
  const profile = listServerProfiles().find((entry) => entry.id === profileId);
  if (profile?.kind === "cloud") return profile.name?.trim() || "Kosmos Cloud";
  if (profile?.name?.trim()) return profile.name.trim();
  return "Server";
}

/** STUB: replace with useContactsStore when os.contacts@1 exists. */
export function useContactsStub() {
  const notify = useOsStore((s) => s.notify);

  const activeBackendId = useContactsStore((s) => s.activeBackendId);
  const contactsByBackend = useContactsStore((s) => s.contactsByBackend);
  const setActiveBackendId = useContactsStore((s) => s.setActiveBackendId);
  const ensureBackend = useContactsStore((s) => s.ensureBackend);
  const addContact = useContactsStore((s) => s.addContact);
  const updateContact = useContactsStore((s) => s.updateContact);
  const deleteContact = useContactsStore((s) => s.deleteContact);
  const toggleFavorite = useContactsStore((s) => s.toggleFavorite);
  const importContacts = useContactsStore((s) => s.importContacts);

  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialValue, setDialValue] = useState("");
  const [listWidth, setListWidth] = useState(300);
  const [dialWidth, setDialWidth] = useState(280);
  const [keypadVisible, setKeypadVisible] = useState(false);

  useEffect(() => {
    ensureBackend(activeBackendId);
  }, [activeBackendId, ensureBackend]);

  const accountContacts = useMemo(
    () => contactsByBackend[activeBackendId] ?? [],
    [contactsByBackend, activeBackendId],
  );

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return accountContacts;
    return accountContacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.phone.includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.company?.toLowerCase().includes(query),
    );
  }, [accountContacts, searchQuery]);

  const activeContact = useMemo(
    () =>
      filteredContacts.find((contact) => contact.id === activeContactId) ??
      accountContacts.find((c) => c.id === activeContactId),
    [filteredContacts, accountContacts, activeContactId],
  );

  const selectContact = useCallback(
    (id: string) => {
      setActiveContactId(id);
      const contact = accountContacts.find((entry) => entry.id === id);
      if (contact) setDialValue(contact.phone);
    },
    [accountContacts],
  );

  const switchBackend = useCallback(
    (id: string) => {
      setActiveBackendId(id);
      setActiveContactId(null);
      setDialValue("");
      setSearchQuery("");
    },
    [setActiveBackendId],
  );

  const appendDial = useCallback((key: string) => {
    setDialValue((prev) => prev + key);
  }, []);

  const backspaceDial = useCallback(() => {
    setDialValue((prev) => prev.slice(0, -1));
  }, []);

  const callContact = useCallback(
    (phone: string) => {
      setDialValue(phone);
      setKeypadVisible(true);
      notify(`Calling ${phone} (telephony stub)`);
    },
    [notify],
  );

  const callFromDialPad = useCallback(() => {
    if (!dialValue.trim()) return;
    notify(`Calling ${dialValue} (telephony stub)`);
  }, [dialValue, notify]);

  const toggleKeypad = useCallback(() => {
    setKeypadVisible((visible) => !visible);
  }, []);

  const saveContact = useCallback(
    (input: ContactInput, editingId?: string | null) => {
      if (editingId) {
        updateContact(editingId, input);
        notify("Contact updated");
        return;
      }
      const created = addContact(input);
      setActiveContactId(created.id);
      setDialValue(created.phone);
      notify("Contact added");
    },
    [addContact, notify, updateContact],
  );

  const removeContact = useCallback(
    (id: string) => {
      deleteContact(id);
      if (activeContactId === id) setActiveContactId(null);
      notify("Contact deleted");
    },
    [activeContactId, deleteContact, notify],
  );

  const runImport = useCallback(
    (rows: ContactInput[], mode: ContactImportMode) => {
      const count = importContacts(rows, mode);
      notify(`Imported ${count} contact${count === 1 ? "" : "s"}`);
    },
    [importContacts, notify],
  );

  const activeBackendLabel = backendDisplayLabel(activeBackendId);

  return {
    activeBackendId,
    activeBackendLabel,
    switchBackend,
    contacts: filteredContacts,
    activeContactId,
    setActiveContactId: selectContact,
    activeContact,
    searchQuery,
    setSearchQuery,
    dialValue,
    setDialValue,
    appendDial,
    backspaceDial,
    callContact,
    callFromDialPad,
    saveContact,
    removeContact,
    toggleFavorite,
    runImport,
    listWidth,
    setListWidth,
    dialWidth,
    setDialWidth,
    keypadVisible,
    toggleKeypad,
  };
}

export type ContactsViewModel = ReturnType<typeof useContactsStub>;
