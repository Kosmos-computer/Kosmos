import { Mail, MessageSquare, Pencil, Phone, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, Button } from "../../components/ui";
import type { PhoneContact } from "./types";

export function ContactDetail({
  contact,
  onCall,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  contact?: PhoneContact;
  onCall: (phone: string) => void;
  onEdit: (contact: PhoneContact) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
  }, [contact?.id]);

  if (!contact) {
    return (
      <div className="arco-contacts__detail arco-contacts__detail--empty">
        <div className="arco-empty">
          <strong className="arco-empty__title">Select a contact</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="arco-contacts__detail arco-scroll">
      <div className="arco-contacts__detail-toolbar">
        <Button variant="ghost" onClick={() => onEdit(contact)}>
          <Pencil size={15} />
          Edit
        </Button>
        <Button variant="ghost" onClick={() => onToggleFavorite(contact.id)}>
          <Star size={15} fill={contact.favorite ? "currentColor" : "none"} />
          {contact.favorite ? "Unfavorite" : "Favorite"}
        </Button>
        {confirmDelete ? (
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="ghost" className="arco-contacts__delete-confirm" onClick={() => onDelete(contact.id)}>
              <Trash2 size={15} />
              Confirm delete
            </Button>
          </>
        ) : (
          <Button variant="ghost" className="arco-contacts__delete" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} />
            Delete
          </Button>
        )}
      </div>

      <div className="arco-contacts__detail-header">
        <Avatar name={contact.name} size="md" />
        <div>
          <h2>{contact.name}</h2>
          {contact.title || contact.company ? (
            <p>{[contact.title, contact.company].filter(Boolean).join(" · ")}</p>
          ) : null}
        </div>
        {contact.favorite ? <Star size={16} className="arco-contacts__favorite" fill="currentColor" /> : null}
      </div>

      <div className="arco-contacts__detail-actions">
        <Button variant="primary" onClick={() => onCall(contact.phone)}>
          <Phone size={15} />
          Call
        </Button>
        <Button>
          <MessageSquare size={15} />
          Message
        </Button>
        {contact.email ? (
          <Button>
            <Mail size={15} />
            Email
          </Button>
        ) : null}
      </div>

      <dl className="arco-contacts__fields">
        <div>
          <dt>{contact.phoneLabel ?? "Phone"}</dt>
          <dd>{contact.phone}</dd>
        </div>
        {contact.email ? (
          <div>
            <dt>Email</dt>
            <dd>{contact.email}</dd>
          </div>
        ) : null}
        {contact.company ? (
          <div>
            <dt>Company</dt>
            <dd>{contact.company}</dd>
          </div>
        ) : null}
        {contact.title ? (
          <div>
            <dt>Title</dt>
            <dd>{contact.title}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
