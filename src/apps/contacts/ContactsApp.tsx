import { Grid3x3, Plus, Search, Star, Upload } from "lucide-react";
import { useState } from "react";
import { ListItem, SidebarPane } from "../../components/patterns";
import { Avatar, Button, EmptyState, Input } from "../../components/ui";
import { ContactDetail } from "./ContactDetail";
import { ContactFormModal } from "./ContactFormModal";
import { ContactImportModal } from "./ContactImportModal";
import { ContactsAccountSwitcher } from "./ContactsAccountSwitcher";
import { DialPad } from "./DialPad";
import { useContactsStub } from "./useContactsStub";
import type { PhoneContact } from "./types";

export function ContactsApp() {
  const contacts = useContactsStub();
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<PhoneContact | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  function openAddForm() {
    setEditingContact(null);
    setFormOpen(true);
  }

  function openEditForm(contact: PhoneContact) {
    setEditingContact(contact);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingContact(null);
  }

  return (
    <div className="arco-contacts">
      <SidebarPane width={contacts.listWidth} onWidthChange={contacts.setListWidth} minWidth={240} maxWidth={420}>
        <div className="arco-contacts__list-pane">
          <div className="arco-contacts__list-header">
            <ContactsAccountSwitcher
              accounts={contacts.accounts}
              activeAccountId={contacts.activeAccountId}
              onSelectAccount={contacts.setActiveAccountId}
              onAddLocalAccount={contacts.addLocalAccount}
              onConnectAccount={contacts.connectAccount}
              onRemoveAccount={contacts.removeAccount}
            />

            <div className="arco-contacts__list-title-row">
              <h1>Contacts</h1>
              <div className="arco-contacts__header-actions">
                <Button variant="ghost" className="arco-btn--icon" title="Add contact" aria-label="Add contact" onClick={openAddForm}>
                  <Plus size={16} />
                </Button>
                <Button
                  variant="ghost"
                  className="arco-btn--icon"
                  title="Import contacts"
                  aria-label="Import contacts"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload size={16} />
                </Button>
                <button
                  type="button"
                  className="arco-contacts__keypad-toggle"
                  aria-pressed={contacts.keypadVisible}
                  aria-expanded={contacts.keypadVisible}
                  title={contacts.keypadVisible ? "Hide keypad" : "Show keypad"}
                  aria-label={contacts.keypadVisible ? "Hide keypad" : "Show keypad"}
                  onClick={contacts.toggleKeypad}
                >
                  <Grid3x3 size={16} strokeWidth={1.75} />
                </button>
              </div>
            </div>

            <div className="arco-contacts__search">
              <Search size={14} className="arco-icon--tertiary" />
              <Input
                value={contacts.searchQuery}
                onChange={(event) => contacts.setSearchQuery(event.target.value)}
                placeholder="Search contacts"
                aria-label="Search contacts"
                width="auto"
              />
            </div>
          </div>

          <div className="arco-contacts__list arco-scroll">
            {contacts.contacts.length === 0 ? (
              <EmptyState title="No contacts found">
                <p className="arco-contacts__empty-copy">
                  {contacts.searchQuery ? "Try a different search." : "Add or import contacts to get started."}
                </p>
                {!contacts.searchQuery ? (
                  <div className="arco-contacts__empty-actions">
                    <Button variant="primary" onClick={openAddForm}>
                      Add contact
                    </Button>
                    <Button onClick={() => setImportOpen(true)}>Import</Button>
                  </div>
                ) : null}
              </EmptyState>
            ) : (
              contacts.contacts.map((contact) => (
                <ListItem
                  key={contact.id}
                  className="arco-contacts__row"
                  leading={<Avatar name={contact.name} size="sm" />}
                  label={
                    <span className="arco-contacts__row-label">
                      {contact.name}
                      {contact.favorite ? <Star size={12} fill="currentColor" className="arco-contacts__favorite" /> : null}
                    </span>
                  }
                  description={contact.company ?? contact.phone}
                  active={contact.id === contacts.activeContactId}
                  onClick={() => contacts.setActiveContactId(contact.id)}
                />
              ))
            )}
          </div>
        </div>
      </SidebarPane>

      <ContactDetail
        contact={contacts.activeContact}
        onCall={contacts.callContact}
        onEdit={openEditForm}
        onDelete={contacts.removeContact}
        onToggleFavorite={contacts.toggleFavorite}
      />

      {contacts.keypadVisible ? (
        <SidebarPane
          width={contacts.dialWidth}
          onWidthChange={contacts.setDialWidth}
          minWidth={240}
          maxWidth={320}
          handleLabel="Resize dial pad"
        >
          <DialPad
            value={contacts.dialValue}
            onAppend={contacts.appendDial}
            onBackspace={contacts.backspaceDial}
            onCall={contacts.callFromDialPad}
          />
        </SidebarPane>
      ) : null}

      <ContactFormModal
        open={formOpen}
        contact={editingContact}
        onClose={closeForm}
        onSave={(input) => contacts.saveContact(input, editingContact?.id ?? null)}
      />

      <ContactImportModal
        open={importOpen}
        accountLabel={contacts.activeAccount?.label ?? "this account"}
        onClose={() => setImportOpen(false)}
        onImport={contacts.runImport}
      />
    </div>
  );
}
