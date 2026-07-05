/**
 * Auth screens — boot splash, first-run setup, login, and lock.
 *
 * All four are full-viewport layers rendered by AuthGate; the setup/login/
 * lock trio shares AuthCard (wallpaper backdrop + glass card) so they feel
 * like one surface morphing between states rather than separate pages.
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useOsStore } from "../osStore";
import { useAuthStore } from "./authStore";

// ── Boot splash ──────────────────────────────────────────────────────────────

/** Logo + loading bar; the bar's CSS animation is timed to MIN_BOOT_MS. */
export function BootScreen() {
  return (
    <div className="arco-boot" role="status" aria-label="Arco OS is starting">
      <div className="arco-boot__logo">
        <div className="arco-boot__mark" />
        <div className="arco-boot__name">Arco OS</div>
      </div>
      <div className="arco-boot__bar">
        <div className="arco-boot__bar-fill" />
      </div>
    </div>
  );
}

// ── Shared card scaffold ─────────────────────────────────────────────────────

/** Wallpaper-backed centered card used by setup, login, and lock. */
function AuthCard({ children }: { children: ReactNode }) {
  const wallpaper = useOsStore((s) => s.wallpaper);
  return (
    <div className={`arco-authscreen arco-wallpaper-${wallpaper}`}>
      <div className="arco-authscreen__card">{children}</div>
    </div>
  );
}

/** Error line bound to the auth store — shared by every form below. */
function AuthError() {
  const error = useAuthStore((s) => s.error);
  if (!error) return null;
  return <div className="arco-authscreen__error" role="alert">{error}</div>;
}

// ── First-run setup ──────────────────────────────────────────────────────────

/** Creates the owner account; only reachable while zero accounts exist. */
export function SetupScreen() {
  const setup = useAuthStore((s) => s.setup);
  const clearError = useAuthStore((s) => s.clearError);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setLocalError("Passwords do not match");
      return;
    }
    setLocalError(null);
    clearError();
    setBusy(true);
    await setup({ username, displayName: displayName || undefined, password });
    setBusy(false);
  };

  return (
    <AuthCard>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__mark" />
        <div className="arco-authscreen__title">Welcome to Arco</div>
        <div className="arco-authscreen__subtitle">Create the owner account to secure this instance</div>
      </div>
      <form className="arco-authscreen__form" onSubmit={(e) => void submit(e)}>
        <div>
          <label className="arco-label" htmlFor="setup-username">Username</label>
          <input
            id="setup-username"
            className="arco-input"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="arco-label" htmlFor="setup-display">Display name (optional)</label>
          <input
            id="setup-display"
            className="arco-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div>
          <label className="arco-label" htmlFor="setup-password">Password</label>
          <input
            id="setup-password"
            className="arco-input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="arco-label" htmlFor="setup-confirm">Confirm password</label>
          <input
            id="setup-confirm"
            className="arco-input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        {localError && <div className="arco-authscreen__error" role="alert">{localError}</div>}
        <AuthError />
        <button className="arco-btn arco-btn--primary" type="submit" disabled={busy} style={{ justifyContent: "center" }}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}

// ── Login ────────────────────────────────────────────────────────────────────

export function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const clearError = useAuthStore((s) => s.clearError);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setBusy(true);
    await login(username, password);
    setBusy(false);
  };

  return (
    <AuthCard>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__mark" />
        <div className="arco-authscreen__title">Arco OS</div>
        <div className="arco-authscreen__subtitle">Sign in to continue</div>
      </div>
      <form className="arco-authscreen__form" onSubmit={(e) => void submit(e)}>
        <div>
          <label className="arco-label" htmlFor="login-username">Username</label>
          <input
            id="login-username"
            className="arco-input"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="arco-label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="arco-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <AuthError />
        <button className="arco-btn arco-btn--primary" type="submit" disabled={busy} style={{ justifyContent: "center" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthCard>
  );
}

// ── Lock ─────────────────────────────────────────────────────────────────────

/**
 * Lock screen — the session survives, only the password gets you back in.
 * Shows identity (initial + name) per OS convention; "Sign out" escapes to
 * the login screen for a different user.
 */
export function LockScreen() {
  const user = useAuthStore((s) => s.user);
  const unlock = useAuthStore((s) => s.unlock);
  const logout = useAuthStore((s) => s.logout);
  const clearError = useAuthStore((s) => s.clearError);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-focus after a failed attempt so retyping is immediate.
  const error = useAuthStore((s) => s.error);
  useEffect(() => {
    if (error) inputRef.current?.focus();
  }, [error]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setBusy(true);
    await unlock(password);
    setBusy(false);
    setPassword("");
  };

  const name = user?.displayName ?? "Locked";
  return (
    <AuthCard>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__avatar" aria-hidden>
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="arco-authscreen__title">{name}</div>
        <div className="arco-authscreen__subtitle">Enter your password to unlock</div>
      </div>
      <form className="arco-authscreen__form" onSubmit={(e) => void submit(e)}>
        <input
          ref={inputRef}
          className="arco-input"
          type="password"
          aria-label="Password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <AuthError />
        <button className="arco-btn arco-btn--primary" type="submit" disabled={busy} style={{ justifyContent: "center" }}>
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </form>
      <div className="arco-authscreen__footer">
        <button className="arco-authscreen__link" onClick={() => void logout()}>
          Not you? Sign out
        </button>
      </div>
    </AuthCard>
  );
}
