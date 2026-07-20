import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useRef, useState } from "react";
import { FileUp, Upload, X } from "lucide-react";
import { Button, Chip } from "../../components/ui";
import { parseContactsFile } from "./importContacts";
import type { ContactImportMode, ContactInput } from "./types";

export interface ContactImportModalProps {
  open: boolean;
  accountLabel: string;
  onClose: () => void;
  onImport: (rows: ContactInput[], mode: ContactImportMode) => void;
}

export function ContactImportModal({ open, accountLabel, onClose, onImport }: ContactImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ContactInput[]>([]);
  const [mode, setMode] = useState<ContactImportMode>("merge");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setFileName(null);
    setPreview([]);
    setMode("merge");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseContactsFile(file.name, text);
      if (parsed.length === 0) {
        setError("No contacts found in this file. Try a .vcf or .csv export.");
        setPreview([]);
        setFileName(file.name);
        return;
      }
      setPreview(parsed);
      setFileName(file.name);
    } catch {
      setError("Could not read this file.");
      setPreview([]);
      setFileName(file.name);
    }
  }

  function handleImport() {
    if (preview.length === 0) return;
    onImport(preview, mode);
    handleClose();
  }

  return (
    <div className="arco-contact-modal__backdrop" role="presentation" onClick={handleClose}>
      <div
        className="arco-contact-modal arco-contact-modal--wide"
        role="dialog"
        aria-labelledby="contact-import-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="arco-contact-modal__header">
          <div className="arco-contact-modal__title-row">
            <Upload size={18} aria-hidden />
            <h2 id="contact-import-title"><T k={I18nKey.APPS$CONTACTS_IMPORT_CONTACTS} /></h2>
          </div>
          <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={handleClose} aria-label={i18n.t(I18nKey.COMMON$CLOSE)}>
            <X size={16} />
          </button>
        </header>

        <div className="arco-contact-modal__body">
          <p className="arco-contact-modal__hint"><T k={I18nKey.APPS$CONTACTS_IMPORT_INTO} /><strong>{accountLabel}</strong><T k={I18nKey.APPS$CONTACTS_SUPPORTS_VCARD_VCF_AND_CSV_EXPORTS} /></p>

          <button
            type="button"
            className="arco-contact-import__dropzone"
            onClick={() => inputRef.current?.click()}
          >
            <FileUp size={22} aria-hidden />
            <span>{fileName ? fileName : "Choose a .vcf or .csv file"}</span>
            <small>{preview.length > 0 ? `${preview.length} contacts ready` : "Click to browse"}</small>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".vcf,.vcard,.csv,text/vcard,text/csv"
            className="arco-contact-import__file-input"
            onChange={handleFileChange}
          />

          {error ? <p className="arco-contact-modal__error">{error}</p> : null}

          {preview.length > 0 ? (
            <>
              <section className="arco-contact-modal__section">
                <span className="arco-contact-modal__label"><T k={I18nKey.APPS$CONTACTS_IMPORT_MODE} /></span>
                <div className="arco-contact-modal__chips" role="group" aria-label={i18n.t(I18nKey.APPS$CONTACTS_IMPORT_MODE)}>
                  <Chip active={mode === "merge"} aria-pressed={mode === "merge"} onClick={() => setMode("merge")}><T k={I18nKey.APPS$CONTACTS_MERGE_WITH_EXISTING} /></Chip>
                  <Chip active={mode === "replace"} aria-pressed={mode === "replace"} onClick={() => setMode("replace")}><T k={I18nKey.APPS$CONTACTS_REPLACE_ALL_IN_ACCOUNT} /></Chip>
                </div>
              </section>

              <section className="arco-contact-modal__section">
                <span className="arco-contact-modal__label"><T k={I18nKey.APPS$CONTACTS_PREVIEW} /></span>
                <ul className="arco-contact-import__preview arco-scroll">
                  {preview.slice(0, 8).map((row, index) => (
                    <li key={`${row.name}-${index}`}>
                      <strong>{row.name}</strong>
                      <span>{row.phone}</span>
                      {row.email ? <span>{row.email}</span> : null}
                    </li>
                  ))}
                  {preview.length > 8 ? (
                    <li className="arco-contact-import__preview-more">
                      + {preview.length - 8} <T k={I18nKey.APPS$CONTACTS_MORE} />
                    </li>
                  ) : null}
                </ul>
              </section>
            </>
          ) : null}
        </div>

        <footer className="arco-contact-modal__footer">
          <Button variant="ghost" onClick={handleClose}><T k={I18nKey.COMMON$CANCEL} /></Button>
          <Button variant="primary" onClick={handleImport} disabled={preview.length === 0}>
            {preview.length > 0
              ? `${i18n.t(I18nKey.APPS$CONTACTS_IMPORT)} ${preview.length} ${i18n.t(I18nKey.APPS$CONTACTS_CONTACTS)}`
              : i18n.t(I18nKey.APPS$CONTACTS_IMPORT_CONTACTS)}
          </Button>
        </footer>
      </div>
    </div>
  );
}
