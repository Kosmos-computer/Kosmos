import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * UsersSection — account management inside Settings.
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import type { Role, UserSummary } from "@shared/types";
import { api } from "../../lib/api";
import { useAuthStore } from "../../os/auth/authStore";
import {
  ListSearch,
  SettingsAlert,
  SettingsEmpty,
  SettingsFieldRow,
  SettingsPage,
  SettingsPanel,
  SettingsPanelBody,
  SettingsPanelHeader,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
  SettingsSubhead,
} from "../../components/patterns";
import { Button, Input } from "../../components/ui";
import { matchesListSearch } from "../../lib/listSearch";

const ROLES: { id: Role; label: string; hint: string }[] = [
  { id: "admin", label: "Admin", hint: "Everything except managing accounts" },
  { id: "member", label: "Member", hint: "Chat + build apps; no terminal or settings" },
  { id: "viewer", label: "Viewer", hint: "Read-only file access" },
  { id: "owner", label: "Owner", hint: "Full control including accounts" },
];

export function UsersSection() {
  const me = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [busy, setBusy] = useState(false);

  const [resetId, setResetId] = useState<string | null>(null);
  const [resetValue, setResetValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter((u) =>
    matchesListSearch(searchQuery, u.displayName, u.username, u.role, u.id),
  );

  const refresh = useCallback(() => {
    api.listUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  useEffect(refresh, [refresh]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.createUser({ username, password, role });
      setUsername("");
      setPassword("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (id: string, next: Role) => {
    setError(null);
    try {
      await api.updateUser(id, { role: next });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await api.deleteUser(id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const resetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetId) return;
    setError(null);
    try {
      await api.updateUser(resetId, { password: resetValue });
      setResetId(null);
      setResetValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    }
  };

  return (
    <SettingsPage>
      <SettingsSection intro={i18n.t(I18nKey.APPS$SETTINGS_CREATE_ACCOUNTS_ASSIGN_ROLES_AND_RESET_PASSWORDS_THE_SER)}>
        {error ? <SettingsAlert tone="error">{error}</SettingsAlert> : null}

        <SettingsStack>
          {users.length > 0 ? (
            <ListSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={i18n.t(I18nKey.APPS$SETTINGS_SEARCH_USERS)}
              ariaLabel="Search users"
            />
          ) : null}
          {filteredUsers.length === 0 && users.length > 0 ? (
            <SettingsEmpty><T k={I18nKey.APPS$SETTINGS_NO_USERS_MATCH_YOUR_SEARCH} /></SettingsEmpty>
          ) : null}
          {filteredUsers.map((u) => (
            <SettingsPanel key={u.id}>
              <SettingsPanelHeader>
                <div className="arco-settings-row__control" style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                  <span className="arco-settings-panel__title">
                    {u.displayName}
                    {u.id === me?.id ? <span className="arco-settings-panel__meta"><T k={I18nKey.APPS$SETTINGS_YOU} /></span> : null}
                  </span>
                  <span className="arco-settings-panel__meta">@{u.username}</span>
                </div>
                <SettingsRowActions>
                  <select
                    className="arco-input arco-input--auto"
                    value={u.role}
                    aria-label={`Role for ${u.username}`}
                    onChange={(e) => void changeRole(u.id, e.target.value as Role)}
                    disabled={u.id === me?.id}
                  >
                    {ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => {
                      setResetValue("");
                      setResetId(resetId === u.id ? null : u.id);
                    }}
                    disabled={u.id === me?.id}
                    aria-label={`Reset password for ${u.username}`}
                    aria-expanded={resetId === u.id}
                    title={i18n.t(I18nKey.APPS$SETTINGS_RESET_PASSWORD)}
                  >
                    <KeyRound size={13} />
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => void remove(u.id)}
                    disabled={u.id === me?.id}
                    aria-label={`Delete ${u.username}`}
                  >
                    <Trash2 size={13} />
                  </Button>
                </SettingsRowActions>
              </SettingsPanelHeader>
              {resetId === u.id && (
                <SettingsPanelBody>
                  <form onSubmit={(e) => void resetPassword(e)} className="arco-settings-tool-row">
                    <Input
                      type="password"
                      placeholder={i18n.t(I18nKey.APPS$SETTINGS_NEW_PASSWORD_8_CHARS)}
                      aria-label={`New password for ${u.username}`}
                      autoComplete="new-password"
                      autoFocus
                      minLength={8}
                      value={resetValue}
                      onChange={(e) => setResetValue(e.target.value)}
                      required
                    />
                    <Button variant="primary" type="submit"><T k={I18nKey.APPS$SETTINGS_SET} /></Button>
                    <Button type="button" onClick={() => setResetId(null)}><T k={I18nKey.COMMON$CANCEL} /></Button>
                  </form>
                </SettingsPanelBody>
              )}
            </SettingsPanel>
          ))}
        </SettingsStack>

        <SettingsSubhead><T k={I18nKey.APPS$SETTINGS_ADD_ACCOUNT} /></SettingsSubhead>
        <form onSubmit={(e) => void create(e)}>
          <SettingsStack>
            <SettingsFieldRow label={i18n.t(I18nKey.OS_AUTH_USERNAME)}>
              <Input
                width="auto"
                placeholder={i18n.t(I18nKey.APPS$SETTINGS_USERNAME)}
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </SettingsFieldRow>
            <SettingsFieldRow label={i18n.t(I18nKey.OS_AUTH_PASSWORD)}>
              <Input
                width="auto"
                type="password"
                placeholder={i18n.t(I18nKey.APPS$SETTINGS_8_CHARACTERS)}
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </SettingsFieldRow>
            <SettingsFieldRow label={i18n.t(I18nKey.APPS$SETTINGS_ROLE)}>
              <select
                className="arco-input arco-input--auto"
                value={role}
                aria-label={i18n.t(I18nKey.APPS$SETTINGS_ROLE_FOR_THE_NEW_ACCOUNT)}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id} title={r.hint}>
                    {r.label}
                  </option>
                ))}
              </select>
            </SettingsFieldRow>
            <SettingsFieldRow label=" " hint={ROLES.find((r) => r.id === role)?.hint}>
              <Button variant="primary" type="submit" disabled={busy}>
                {busy ? "Adding…" : "Add account"}
              </Button>
            </SettingsFieldRow>
          </SettingsStack>
        </form>
      </SettingsSection>
    </SettingsPage>
  );
}
