/**
 * UsersSection — account management inside Settings, visible only with the
 * users:manage capability (the server enforces it regardless). Lists
 * accounts, creates new ones with a role, changes roles, and deletes —
 * the owner-protection rules (can't delete/demote the last owner) surface
 * here as server error messages.
 */
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import type { Role, UserSummary } from "@shared/types";
import { api } from "../../lib/api";
import { useAuthStore } from "../../os/auth/authStore";

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

  // Create form
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [busy, setBusy] = useState(false);

  // Inline per-user password reset (admin action — no old password needed;
  // the server revokes that user's sessions on change).
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetValue, setResetValue] = useState("");

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
    <section className="arco-form">
      <strong>Accounts</strong>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--arco-space-s)" }}>
        {users.map((u) => (
          <div
            key={u.id}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--arco-space-s)",
              padding: "var(--arco-space-s)",
              borderRadius: "var(--arco-radius-s)",
              border: "1px solid var(--arco-border)",
              background: "var(--arco-bg-sunk)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--arco-space-s)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>
                  {u.displayName}
                  {u.id === me?.id && (
                    <span style={{ color: "var(--arco-text-tertiary)", fontSize: "var(--arco-text-xs)" }}> (you)</span>
                  )}
                </div>
                <div style={{ color: "var(--arco-text-tertiary)", fontSize: "var(--arco-text-xs)" }}>@{u.username}</div>
              </div>
              <select
                className="arco-input"
                style={{ width: "auto" }}
                value={u.role}
                aria-label={`Role for ${u.username}`}
                onChange={(e) => void changeRole(u.id, e.target.value as Role)}
                disabled={u.id === me?.id}
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              <button
                className="arco-btn"
                onClick={() => {
                  setResetValue("");
                  setResetId(resetId === u.id ? null : u.id);
                }}
                disabled={u.id === me?.id}
                aria-label={`Reset password for ${u.username}`}
                aria-expanded={resetId === u.id}
                title="Reset password"
              >
                <KeyRound size={13} />
              </button>
              <button
                className="arco-btn arco-btn--danger"
                onClick={() => void remove(u.id)}
                disabled={u.id === me?.id}
                aria-label={`Delete ${u.username}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
            {resetId === u.id && (
              <form onSubmit={(e) => void resetPassword(e)} style={{ display: "flex", gap: "var(--arco-space-s)" }}>
                <input
                  className="arco-input"
                  type="password"
                  placeholder="New password (8+ chars)"
                  aria-label={`New password for ${u.username}`}
                  autoComplete="new-password"
                  autoFocus
                  minLength={8}
                  value={resetValue}
                  onChange={(e) => setResetValue(e.target.value)}
                  required
                />
                <button className="arco-btn arco-btn--primary" type="submit">Set</button>
                <button className="arco-btn" type="button" onClick={() => setResetId(null)}>Cancel</button>
              </form>
            )}
          </div>
        ))}
      </div>

      <label className="arco-label" style={{ marginTop: "var(--arco-space-s)" }}>Add account</label>
      <form onSubmit={(e) => void create(e)} style={{ display: "flex", gap: "var(--arco-space-s)", flexWrap: "wrap" }}>
        <input
          className="arco-input"
          style={{ flex: "1 1 120px" }}
          placeholder="username"
          autoComplete="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="arco-input"
          style={{ flex: "1 1 140px" }}
          type="password"
          placeholder="password (8+ chars)"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <select
          className="arco-input"
          style={{ width: "auto" }}
          value={role}
          aria-label="Role for the new account"
          onChange={(e) => setRole(e.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r.id} value={r.id} title={r.hint}>{r.label}</option>
          ))}
        </select>
        <button className="arco-btn arco-btn--primary" type="submit" disabled={busy}>
          {busy ? "Adding…" : "Add"}
        </button>
      </form>
      <div style={{ color: "var(--arco-text-tertiary)", fontSize: "var(--arco-text-xs)" }}>
        {ROLES.find((r) => r.id === role)?.hint}
      </div>

      {error && (
        <div style={{ color: "var(--arco-danger)", fontSize: "var(--arco-text-sm)" }} role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
