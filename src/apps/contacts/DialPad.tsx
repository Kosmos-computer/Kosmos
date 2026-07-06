import { Delete, Phone } from "lucide-react";
import { Button } from "../../components/ui";
import { DIAL_PAD_KEYS, DIAL_PAD_LETTERS, type DialPadKey } from "./types";

export function DialPad({
  value,
  onAppend,
  onBackspace,
  onCall,
}: {
  value: string;
  onAppend: (key: string) => void;
  onBackspace: () => void;
  onCall: () => void;
}) {
  return (
    <div className="arco-dial-pad">
      <div className="arco-dial-pad__display">{value || "Enter number"}</div>
      <div className="arco-dial-pad__grid">
        {DIAL_PAD_KEYS.flat().map((key, index) =>
          key ? (
            <button key={key} type="button" className="arco-dial-pad__key" onClick={() => onAppend(key)}>
              <span>{key}</span>
              {DIAL_PAD_LETTERS[key as DialPadKey] ? (
                <small>{DIAL_PAD_LETTERS[key as DialPadKey]}</small>
              ) : null}
            </button>
          ) : (
            <span key={`spacer-${index}`} />
          ),
        )}
      </div>
      <div className="arco-dial-pad__actions">
        <button type="button" className="arco-btn arco-btn--ghost arco-btn--icon" onClick={onBackspace} aria-label="Backspace">
          <Delete size={16} />
        </button>
        <Button variant="primary" onClick={onCall}>
          <Phone size={15} />
          Call
        </Button>
      </div>
    </div>
  );
}
