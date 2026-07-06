/**
 * STUB: client-side contacts vault (localStorage).
 * Wire point: swap for os.contacts@1 + contactsService when the platform store exists.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CONTACTS_MOCK, DEFAULT_ACCOUNT_ID, SEED_ACCOUNTS } from "./contactsMock";
import type {
  ContactAccount,
  ContactAccountKind,
  ContactImportMode,
  ContactInput,
  PhoneContact,
} from "./types";

const STORAGE_KEY = "arco-contacts-vault";

const ACCOUNT_ACCENTS = ["#0085ff", "#6366f1", "#0dbd8b", "#f59e0b", "#ec4899", "#8b5cf6"];

function initialsFor(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase() || "??";
}

function nextContactId(): string {
  return `contact_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function nextAccountId(kind: ContactAccountKind): string {
  return `acct_${kind}_${Date.now().toString(36)}`;
}

function seedContactsByAccount(): Record<string, PhoneContact[]> {
  const map: Record<string, PhoneContact[]> = {};
  for (const account of SEED_ACCOUNTS) {
    map[account.id] = [];
  }
  for (const contact of CONTACTS_MOCK) {
    if (!map[contact.accountId]) map[contact.accountId] = [];
    map[contact.accountId].push(contact);
  }
  return map;
}

interface ContactsStore {
  accounts: ContactAccount[];
  activeAccountId: string;
  contactsByAccount: Record<string, PhoneContact[]>;
  setActiveAccountId: (id: string) => void;
  addLocalAccount: (label: string) => ContactAccount;
  connectAccount: (input: { kind: Exclude<ContactAccountKind, "local">; label: string; email?: string }) => ContactAccount;
  removeAccount: (id: string) => void;
  addContact: (input: ContactInput, accountId?: string) => PhoneContact;
  updateContact: (id: string, input: ContactInput) => void;
  deleteContact: (id: string) => void;
  toggleFavorite: (id: string) => void;
  importContacts: (rows: ContactInput[], mode: ContactImportMode, accountId?: string) => number;
  contactsForAccount: (accountId: string) => PhoneContact[];
  activeAccount: () => ContactAccount | undefined;
}

export const useContactsStore = create<ContactsStore>()(
  persist(
    (set, get) => ({
      accounts: SEED_ACCOUNTS,
      activeAccountId: DEFAULT_ACCOUNT_ID,
      contactsByAccount: seedContactsByAccount(),

      setActiveAccountId(id) {
        if (!get().accounts.some((account) => account.id === id)) return;
        set({ activeAccountId: id });
      },

      addLocalAccount(label) {
        const trimmed = label.trim();
        if (!trimmed) throw new Error("Account name is required");
        const account: ContactAccount = {
          id: nextAccountId("local"),
          label: trimmed,
          kind: "local",
          initials: initialsFor(trimmed),
          accent: ACCOUNT_ACCENTS[get().accounts.length % ACCOUNT_ACCENTS.length],
        };
        set((state) => ({
          accounts: [...state.accounts, account],
          contactsByAccount: { ...state.contactsByAccount, [account.id]: [] },
          activeAccountId: account.id,
        }));
        return account;
      },

      connectAccount(input) {
        const account: ContactAccount = {
          id: nextAccountId(input.kind),
          label: input.label.trim(),
          kind: input.kind,
          email: input.email?.trim() || undefined,
          initials: initialsFor(input.label),
          accent: ACCOUNT_ACCENTS[get().accounts.length % ACCOUNT_ACCENTS.length],
        };
        set((state) => ({
          accounts: [...state.accounts, account],
          contactsByAccount: { ...state.contactsByAccount, [account.id]: [] },
          activeAccountId: account.id,
        }));
        return account;
      },

      removeAccount(id) {
        const { accounts, activeAccountId, contactsByAccount } = get();
        if (accounts.length <= 1) return;
        const nextAccounts = accounts.filter((account) => account.id !== id);
        const { [id]: _removed, ...restContacts } = contactsByAccount;
        const nextActive =
          activeAccountId === id ? (nextAccounts[0]?.id ?? DEFAULT_ACCOUNT_ID) : activeAccountId;
        set({ accounts: nextAccounts, contactsByAccount: restContacts, activeAccountId: nextActive });
      },

      contactsForAccount(accountId) {
        return get().contactsByAccount[accountId] ?? [];
      },

      activeAccount() {
        return get().accounts.find((account) => account.id === get().activeAccountId);
      },

      addContact(input, accountId) {
        const resolvedAccountId = accountId ?? get().activeAccountId;
        const contact: PhoneContact = {
          id: nextContactId(),
          accountId: resolvedAccountId,
          name: input.name.trim(),
          phone: input.phone.trim(),
          phoneLabel: input.phoneLabel?.trim() || undefined,
          email: input.email?.trim() || undefined,
          company: input.company?.trim() || undefined,
          title: input.title?.trim() || undefined,
          favorite: input.favorite ?? false,
        };
        set((state) => ({
          contactsByAccount: {
            ...state.contactsByAccount,
            [resolvedAccountId]: [...(state.contactsByAccount[resolvedAccountId] ?? []), contact],
          },
        }));
        return contact;
      },

      updateContact(id, input) {
        set((state) => {
          const nextMap = { ...state.contactsByAccount };
          for (const accountId of Object.keys(nextMap)) {
            nextMap[accountId] = nextMap[accountId].map((contact) =>
              contact.id === id
                ? {
                    ...contact,
                    name: input.name.trim(),
                    phone: input.phone.trim(),
                    phoneLabel: input.phoneLabel?.trim() || undefined,
                    email: input.email?.trim() || undefined,
                    company: input.company?.trim() || undefined,
                    title: input.title?.trim() || undefined,
                    favorite: input.favorite ?? contact.favorite,
                  }
                : contact,
            );
          }
          return { contactsByAccount: nextMap };
        });
      },

      deleteContact(id) {
        set((state) => {
          const nextMap = { ...state.contactsByAccount };
          for (const accountId of Object.keys(nextMap)) {
            nextMap[accountId] = nextMap[accountId].filter((contact) => contact.id !== id);
          }
          return { contactsByAccount: nextMap };
        });
      },

      toggleFavorite(id) {
        set((state) => {
          const nextMap = { ...state.contactsByAccount };
          for (const accountId of Object.keys(nextMap)) {
            nextMap[accountId] = nextMap[accountId].map((contact) =>
              contact.id === id ? { ...contact, favorite: !contact.favorite } : contact,
            );
          }
          return { contactsByAccount: nextMap };
        });
      },

      importContacts(rows, mode, accountId) {
        const resolvedAccountId = accountId ?? get().activeAccountId;
        const normalized = rows
          .map((row) => ({
            name: row.name.trim(),
            phone: row.phone.trim() || "—",
            phoneLabel: row.phoneLabel?.trim() || undefined,
            email: row.email?.trim() || undefined,
            company: row.company?.trim() || undefined,
            title: row.title?.trim() || undefined,
            favorite: row.favorite ?? false,
          }))
          .filter((row) => row.name.length > 0);

        const imported = normalized.map((row) => ({
          id: nextContactId(),
          accountId: resolvedAccountId,
          ...row,
        }));

        set((state) => ({
          contactsByAccount: {
            ...state.contactsByAccount,
            [resolvedAccountId]:
              mode === "replace"
                ? imported
                : [...(state.contactsByAccount[resolvedAccountId] ?? []), ...imported],
          },
        }));

        return imported.length;
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (state) => ({
        accounts: state.accounts,
        activeAccountId: state.activeAccountId,
        contactsByAccount: state.contactsByAccount,
      }),
      migrate(persisted, version) {
        if (version === 0 || !persisted) {
          return {
            accounts: SEED_ACCOUNTS,
            activeAccountId: DEFAULT_ACCOUNT_ID,
            contactsByAccount: seedContactsByAccount(),
          };
        }
        return persisted as Pick<ContactsStore, "accounts" | "activeAccountId" | "contactsByAccount">;
      },
    },
  ),
);
