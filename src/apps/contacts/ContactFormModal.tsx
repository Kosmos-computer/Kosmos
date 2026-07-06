import { useEffect, useState } from "react";
import { Contact, Star, X } from "lucide-react";
import { Button, Chip, Input } from "../../components/ui";
import type { ContactInput, PhoneContact } from "./types";

export interface ContactFormModalProps {
  open: boolean;
  contact?: PhoneContact | null;
  onClose: () => void;
  onSave: (input: ContactInput) => void;
}

export function ContactFormModal({ open, contact, onClose, onSave }: ContactFormModalProps) {
  const isEditing = Boolean(contact);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneLabel, setPhoneLabel] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (contact) {
      setName(contact.name);
      setPhone(contact.phone);
      setPhoneLabel(contact.phoneLabel ?? "");
      setEmail(contact.email ?? "");
      setCompany(contact.company ?? "");
      setTitle(contact.title ?? "");
      setFavorite(Boolean(contact.favorite));
      return;
    }
    setName("");
    setPhone("");
    setPhoneLabel("");
    setEmail("");
    setCompany("");
    setTitle("");
    setFavorite(false);
  }, [open, contact]);

  if (!open) return null;

  const canSave = name.trim().length > 0 && phone.trim().length > 0;

  function handleSave() {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      phone: phone.trim(),
      phoneLabel: phoneLabel.trim() || undefined,
      email: email.trim() || undefined,
      company: company.trim() || undefined,
      title: title.trim() || undefined,
      favorite,
    });
    onClose();
  }

  return (
    <div className="arco-contact-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="arco-contact-modal"
        role="dialog"
        aria-labelledby="contact-form-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="arco-contact-modal__header">
          <div className="arco-contact-modal__title-row">
            <Contact size={18} aria-hidden />
            <h2 id="contact-form-title">{isEditing ? "Edit contact" : "Add contact"}</h2>
          </div>
          <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <div className="arco-contact-modal__body">
          <section className="arco-contact-modal__section">
            <label className="arco-contact-modal__label" htmlFor="contact-name">
              Name
            </label>
            <Input
              id="contact-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              autoFocus
            />
          </section>

          <section className="arco-contact-modal__section">
            <label className="arco-contact-modal__label" htmlFor="contact-phone">
              Phone
            </label>
            <Input
              id="contact-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+1 (555) 555-0100"
            />
          </section>

          <section className="arco-contact-modal__section">
            <label className="arco-contact-modal__label" htmlFor="contact-phone-label">
              Phone label (optional)
            </label>
            <Input
              id="contact-phone-label"
              value={phoneLabel}
              onChange={(event) => setPhoneLabel(event.target.value)}
              placeholder="Mobile, Work, …"
            />
          </section>

          <section className="arco-contact-modal__section">
            <label className="arco-contact-modal__label" htmlFor="contact-email">
              Email (optional)
            </label>
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
            />
          </section>

          <section className="arco-contact-modal__section">
            <label className="arco-contact-modal__label" htmlFor="contact-company">
              Company (optional)
            </label>
            <Input
              id="contact-company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Organization"
            />
          </section>

          <section className="arco-contact-modal__section">
            <label className="arco-contact-modal__label" htmlFor="contact-title">
              Title (optional)
            </label>
            <Input
              id="contact-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Role or department"
            />
          </section>

          <section className="arco-contact-modal__section">
            <span className="arco-contact-modal__label">Favorite</span>
            <Chip active={favorite} aria-pressed={favorite} onClick={() => setFavorite((value) => !value)}>
              <Star size={12} fill={favorite ? "currentColor" : "none"} />
              Mark as favorite
            </Chip>
          </section>
        </div>

        <footer className="arco-contact-modal__footer">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!canSave}>
            {isEditing ? "Save changes" : "Add contact"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
