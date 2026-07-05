/**
 * PasswordSection — change the signed-in user's own password. Requires the
 * current password (server-verified); on success the server rotates every
 * session for the account but re-issues this one, so the user stays in.
 */
import { useState, type FormEvent } from "react";
import { api } from "../../lib/api";

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
    <section className="arco-form">
      <strong>Password</strong>
      <form className="arco-form" onSubmit={(e) => void submit(e)}>
        <div>
          <label className="arco-label" htmlFor="pw-current">Current password</label>
          <input
            id="pw-current"
            className="arco-input"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="arco-label" htmlFor="pw-new">New password</label>
          <input
            id="pw-new"
            className="arco-input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="arco-label" htmlFor="pw-confirm">Confirm new password</label>
          <input
            id="pw-confirm"
            className="arco-input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="arco-btn arco-btn--primary" type="submit" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </button>
          {message && (
            <span
              role={message.kind === "error" ? "alert" : "status"}
              style={{
                color: message.kind === "ok" ? "var(--arco-success)" : "var(--arco-danger)",
                fontSize: "var(--arco-text-sm)",
              }}
            >
              {message.text}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
