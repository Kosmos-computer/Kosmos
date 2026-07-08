import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
/**
 * PasswordSection — change the signed-in user's own password. Requires the
 * current password (server-verified); on success the server rotates every
 * session for the account but re-issues this one, so the user stays in.
 */
import { useState, type FormEvent } from "react";
import { api } from "../../lib/api";
import {
  SettingsAlert,
  SettingsFieldRow,
  SettingsPage,
  SettingsSaveBar,
  SettingsSection,
  SettingsStack,
} from "../../components/patterns";
import { Button, Input } from "../../components/ui";

export function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      setMessage({ kind: "error", text: "New passwords do not match" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setMessage({ kind: "ok", text: "Password updated — other sessions were signed out" });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsPage>
      <SettingsSection intro={i18n.t(I18nKey.APPS$SETTINGS_CHANGE_YOUR_PASSWORD_OTHER_ACTIVE_SESSIONS_WILL_BE_SIGNE)}>
        <form onSubmit={(e) => void submit(e)}>
          {message ? (
            <SettingsAlert tone={message.kind === "ok" ? "success" : "error"}>{message.text}</SettingsAlert>
          ) : null}
          <SettingsStack>
            <SettingsFieldRow label={i18n.t(I18nKey.APPS$SETTINGS_CURRENT)} htmlFor="pw-current">
              <Input
                id="pw-current"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
              />
            </SettingsFieldRow>
            <SettingsFieldRow label={i18n.t(I18nKey.APPS$SETTINGS_NEW_PASSWORD)} htmlFor="pw-new">
              <Input
                id="pw-new"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
              />
            </SettingsFieldRow>
            <SettingsFieldRow label={i18n.t(I18nKey.APPS$SETTINGS_CONFIRM)} htmlFor="pw-confirm">
              <Input
                id="pw-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </SettingsFieldRow>
          </SettingsStack>
          <SettingsSaveBar>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
          </SettingsSaveBar>
        </form>
      </SettingsSection>
    </SettingsPage>
  );
}
