import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useEffect, useMemo, useState } from "react";
import { Bot, ChevronDown, User, UserRound } from "lucide-react";
import { useContactsStore } from "../contacts/contactsStore";
import { Avatar, Chip, Input } from "../../components/ui";
import type { PhoneContact } from "../contacts/types";
import {
  TASK_ASSIGNEE_AGENT_NAME,
  type TaskAssignee,
  type TaskAssigneeKind,
  taskAssigneeLabel,
} from "./types";

type AssignMode = "none" | TaskAssigneeKind;

function modeFromAssignee(assignee?: TaskAssignee): AssignMode {
  if (!assignee) return "none";
  if (assignee.kind === "contact" || assignee.kind === "custom") return "contact";
  return assignee.kind;
}

export interface AssignToPickerProps {
  value?: TaskAssignee;
  selfName: string;
  onChange: (value: TaskAssignee | undefined) => void;
}

export function AssignToPicker({ value, selfName, onChange }: AssignToPickerProps) {
  const contactsByAccount = useContactsStore((s) => s.contactsByAccount);
  const [mode, setMode] = useState<AssignMode>(() => modeFromAssignee(value));
  const [personQuery, setPersonQuery] = useState("");
  const [personOpen, setPersonOpen] = useState(false);

  const allContacts = useMemo(
    () => Object.values(contactsByAccount).flat().sort((a, b) => a.name.localeCompare(b.name)),
    [contactsByAccount],
  );

  useEffect(() => {
    setMode(modeFromAssignee(value));
    if (value?.kind === "contact" || value?.kind === "custom") {
      setPersonQuery(value.name);
    } else {
      setPersonQuery("");
    }
  }, [value]);

  const filteredContacts = useMemo(() => {
    const query = personQuery.trim().toLowerCase();
    if (!query) return allContacts.slice(0, 8);
    return allContacts
      .filter(
        (contact) =>
          contact.name.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.company?.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [allContacts, personQuery]);

  const trimmedQuery = personQuery.trim();
  const exactContact = trimmedQuery
    ? allContacts.find((contact) => contact.name.toLowerCase() === trimmedQuery.toLowerCase())
    : undefined;
  const showCustomOption =
    trimmedQuery.length > 0 && !exactContact && (value?.kind !== "contact" || value.name !== trimmedQuery);

  function selectMode(next: AssignMode) {
    setMode(next);
    setPersonOpen(false);
    if (next === "none") {
      onChange(undefined);
      setPersonQuery("");
      return;
    }
    if (next === "self") {
      onChange({ kind: "self", name: selfName });
      setPersonQuery("");
      return;
    }
    if (next === "agent") {
      onChange({ kind: "agent", name: TASK_ASSIGNEE_AGENT_NAME });
      setPersonQuery("");
      return;
    }
    setPersonOpen(true);
    if (value?.kind === "contact" || value?.kind === "custom") {
      setPersonQuery(value.name);
    } else {
      setPersonQuery("");
      onChange(undefined);
    }
  }

  function selectContact(contact: PhoneContact) {
    setPersonQuery(contact.name);
    setPersonOpen(false);
    onChange({ kind: "contact", name: contact.name, contactId: contact.id });
  }

  function selectCustomName(name: string) {
    setPersonQuery(name);
    setPersonOpen(false);
    onChange({ kind: "custom", name });
  }

  return (
    <div className="arco-task-assign">
      <span className="arco-task-modal__label"><T k={I18nKey.APPS$TASKS_ASSIGN_TO} /></span>
      <div className="arco-task-modal__chips" role="group" aria-label={i18n.t(I18nKey.APPS$TASKS_ASSIGN_TO)}>
        <Chip active={mode === "none"} aria-pressed={mode === "none"} onClick={() => selectMode("none")}><T k={I18nKey.APPS$TASKS_UNASSIGNED} /></Chip>
        <Chip active={mode === "self"} aria-pressed={mode === "self"} onClick={() => selectMode("self")}>
          <UserRound size={13} aria-hidden /><T k={I18nKey.APPS$TASKS_SELF} /></Chip>
        <Chip active={mode === "agent"} aria-pressed={mode === "agent"} onClick={() => selectMode("agent")}>
          <Bot size={13} aria-hidden /><T k={I18nKey.APPS$TASKS_AGENT} /></Chip>
        <Chip active={mode === "contact"} aria-pressed={mode === "contact"} onClick={() => selectMode("contact")}>
          <User size={13} aria-hidden /><T k={I18nKey.APPS$TASKS_PERSON} /></Chip>
      </div>

      {mode === "contact" ? (
        <div className="arco-task-assign__person">
          <div className="arco-task-assign__person-input">
            <Input
              id="task-assign-person"
              value={personQuery}
              onChange={(event) => {
                setPersonQuery(event.target.value);
                setPersonOpen(true);
                if (!event.target.value.trim()) onChange(undefined);
              }}
              onFocus={() => setPersonOpen(true)}
              placeholder={i18n.t(I18nKey.APPS$TASKS_SEARCH_CONTACTS_OR_ENTER_A_NAME)}
              aria-label={i18n.t(I18nKey.APPS$TASKS_ASSIGN_TO_PERSON)}
              aria-expanded={personOpen}
              aria-controls="task-assign-person-list"
            />
            <button
              type="button"
              className="arco-btn arco-btn--ghost arco-btn--icon arco-task-assign__toggle"
              aria-label={personOpen ? "Hide contacts" : "Show contacts"}
              aria-expanded={personOpen}
              onClick={() => setPersonOpen((open) => !open)}
            >
              <ChevronDown size={14} className={personOpen ? "arco-task-assign__chevron--open" : ""} />
            </button>
          </div>

          {personOpen ? (
            <div id="task-assign-person-list" className="arco-task-assign__list" role="listbox">
              {filteredContacts.length === 0 && !showCustomOption ? (
                <p className="arco-task-assign__empty"><T k={I18nKey.APPS$TASKS_NO_MATCHING_CONTACTS} /></p>
              ) : null}
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  role="option"
                  aria-selected={value?.contactId === contact.id}
                  className={[
                    "arco-task-assign__option",
                    value?.contactId === contact.id ? "arco-task-assign__option--selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => selectContact(contact)}
                >
                  <Avatar name={contact.name} size="sm" />
                  <span className="arco-task-assign__option-main">
                    <strong>{contact.name}</strong>
                    <span>{contact.company ?? contact.phone}</span>
                  </span>
                </button>
              ))}
              {showCustomOption ? (
                <button
                  type="button"
                  role="option"
                  className="arco-task-assign__option arco-task-assign__option--custom"
                  onClick={() => selectCustomName(trimmedQuery)}
                >
                  <User size={14} aria-hidden />
                  <span><T k={I18nKey.APPS$TASKS_USE_LDQUO} />{trimmedQuery}&rdquo;</span>
                </button>
              ) : null}
            </div>
          ) : null}

          {value && (value.kind === "contact" || value.kind === "custom") ? (
            <p className="arco-task-assign__summary"><T k={I18nKey.APPS$TASKS_ASSIGNED_TO} />{value.kind === "contact" ? "contact" : "custom name"}:{" "}
              <strong>{taskAssigneeLabel(value)}</strong>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TaskAssigneeMeta({ assignee, compact = false }: { assignee: TaskAssignee; compact?: boolean }) {
  if (assignee.kind === "agent") {
    return (
      <>
        <Bot size={14} aria-hidden />
        <span>{taskAssigneeLabel(assignee)}</span>
      </>
    );
  }

  if (compact) {
    return (
      <>
        <Avatar size="sm" name={assignee.name} />
        <span>{taskAssigneeLabel(assignee)}</span>
      </>
    );
  }

  return (
    <>
      <User size={14} aria-hidden />
      <Avatar size="sm" name={assignee.name} />
      <span>{taskAssigneeLabel(assignee)}</span>
    </>
  );
}
