import { useCallback, useMemo, useState } from "react";
import { useOsStore } from "../../os/osStore";
import { useContactsStore } from "./contactsStore";
import type { ContactImportMode, ContactInput } from "./types";

/** STUB: replace with useContactsStore when os.contacts@1 exists. */
export function useContactsStub() {
  const notify = useOsStore((s) => s.notify);

  const accounts = useContactsStore((s) => s.accounts);
  const activeAccountId = useContactsStore((s) => s.activeAccountId);
  const contactsByAccount = useContactsStore((s) => s.contactsByAccount);
  const setActiveAccountId = useContactsStore((s) => s.setActiveAccountId);
  const addLocalAccount = useContactsStore((s) => s.addLocalAccount);
  const connectAccount = useContactsStore((s) => s.connectAccount);
  const removeAccount = useContactsStore((s) => s.removeAccount);
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

  const activeAccount = useMemo(
    () => accounts.find((account) => account.id === activeAccountId) ?? accounts[0],
    [accounts, activeAccountId],
  );

  const accountContacts = useMemo(
    () => contactsByAccount[activeAccountId] ?? [],
    [contactsByAccount, activeAccountId],
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
    () => filteredContacts.find((contact) => contact.id === activeContactId) ?? accountContacts.find((c) => c.id === activeContactId),
    [filteredContacts, accountContacts, activeContactId],
  );

  const selectContact = useCallback((id: string) => {
    setActiveContactId(id);
    const contact = accountContacts.find((entry) => entry.id === id);
    if (contact) setDialValue(contact.phone);
  }, [accountContacts]);

  const handleAccountChange = useCallback((id: string) => {
    setActiveAccountId(id);
    setActiveContactId(null);
    setDialValue("");
    setSearchQuery("");
  }, [setActiveAccountId]);

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

  return {
    accounts,
    activeAccount,
    activeAccountId,
    setActiveAccountId: handleAccountChange,
    addLocalAccount,
    connectAccount,
    removeAccount,
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
