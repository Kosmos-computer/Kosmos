/**
 * Editable Nostr relay list for Settings → Connected accounts.
 * Persists on each add/remove so users never re-enter nsec to change relays.
 */
import { useCallback, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { SocialAccountInfo } from "@shared/social";
import { SettingsAlert, SettingsFieldRow, SettingsRow, SettingsRowActions, SettingsStack } from "../../components/patterns";
import { Button, Input } from "../../components/ui";
import { api } from "../../lib/api";

interface NostrRelaysEditorProps {
  account: SocialAccountInfo;
  canManage: boolean;
  onUpdated: (account: SocialAccountInfo) => void;
}

export function NostrRelaysEditor({ account, canManage, onUpdated }: NostrRelaysEditorProps) {
  const relays = account.relays ?? [];
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(
    async (next: string[]) => {
      setSaving(true);
      setError(null);
      try {
        const updated = await api.updateNostrRelays(account.id, { relays: next });
        onUpdated(updated);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update relays");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [account.id, onUpdated],
  );

  const addRelay = useCallback(() => {
    const value = draft.trim();
    if (!value || saving) return;
    void persist([...relays, value]).then((ok) => {
      if (ok) setDraft("");
    });
  }, [draft, persist, relays, saving]);

  const removeRelay = useCallback(
    (relay: string) => {
      if (saving) return;
      void persist(relays.filter((entry) => entry !== relay));
    },
    [persist, relays, saving],
  );

  return (
    <SettingsStack>
      {relays.length === 0 ? (
        <SettingsAlert tone="muted">No relays configured — add one below (or leave empty to use defaults).</SettingsAlert>
      ) : (
        relays.map((relay) => (
          <SettingsRow key={relay}>
            <span className="arco-settings-panel__meta" title={relay}>
              {relay}
            </span>
            {canManage ? (
              <SettingsRowActions>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={saving}
                  onClick={() => removeRelay(relay)}
                  aria-label={`Remove ${relay}`}
                >
                  <Trash2 size={14} />
                </Button>
              </SettingsRowActions>
            ) : null}
          </SettingsRow>
        ))
      )}

      {canManage ? (
        <SettingsFieldRow
          label="Add relay"
          htmlFor={`nostr-relay-${account.id}`}
          hint="wss:// or ws:// URL. Removing all relays restores Snort defaults."
        >
          <Input
            id={`nostr-relay-${account.id}`}
            width="auto"
            placeholder="wss://relay.example.com"
            value={draft}
            disabled={saving}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addRelay();
              }
            }}
          />
          <Button disabled={!draft.trim() || saving} onClick={addRelay}>
            <Plus size={14} />
            Add
          </Button>
        </SettingsFieldRow>
      ) : null}

      {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}
    </SettingsStack>
  );
}
